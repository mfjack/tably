"use server";

import { addMonths, parseISO } from "date-fns";
import type { OrganizationId } from "@/features/organizations/types";
import type { SupplierId } from "@/features/suppliers/types";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { toDateKey } from "@/lib/date-key";
import { fromSelectFieldValue } from "@/lib/optional-select-value";
import { createClient } from "@/lib/supabase/server";
import {
  ACCESS_DENIED,
  canUseFinance,
  getDefaultAccountId,
  syncRecurrences,
} from "./finance-core";
import {
  type EntryEditScope,
  type EntryInput,
  entrySchema,
  type PayEntryInput,
  payEntrySchema,
} from "./schemas";
import type { FinancialCategoryId, FinancialEntryId } from "./types";

function toEntryValues(input: EntryInput) {
  return {
    kind: input.kind,
    description: input.description,
    amount: input.amount,
    category_id:
      fromSelectFieldValue<FinancialCategoryId>(input.categoryId) ?? null,
    supplier_id:
      input.kind === "expense"
        ? (fromSelectFieldValue<SupplierId>(input.supplierId) ?? null)
        : null,
    notes: input.notes || null,
  };
}

export async function createFinancialEntry(
  organizationId: OrganizationId,
  input: EntryInput,
): Promise<ActionResult<FinancialEntryId | null>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const parsedInput = entrySchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const entry = parsedInput.data;
  const accountId = await getDefaultAccountId(organizationId);
  if (!accountId) return actionFailure("Não foi possível salvar o lançamento.");
  const values = { ...toEntryValues(entry), account_id: accountId };
  const payment = entry.isPaid
    ? { paid_at: entry.paidAt, paid_amount: entry.amount }
    : { paid_at: null, paid_amount: null };
  const supabase = await createClient();

  if (entry.repeat === "recurring" && entry.frequency) {
    const { data: recurrence, error } = await supabase
      .from("financial_recurrences")
      .insert({
        ...values,
        organization_id: organizationId,
        frequency: entry.frequency,
        start_date: entry.dueDate,
        end_date: entry.endDate || null,
      })
      .select("id")
      .single();

    if (error)
      return databaseFailure("Não foi possível salvar a recorrência.", error);

    const clock = await getOrganizationClock(organizationId);
    const syncUntil =
      clock && clock.today > entry.dueDate ? clock.today : entry.dueDate;
    await syncRecurrences(organizationId, syncUntil);

    if (entry.isPaid) {
      await supabase
        .from("financial_entries")
        .update(payment)
        .eq("recurrence_id", recurrence.id)
        .eq("due_date", entry.dueDate);
    }
    const { data: firstEntry } = await supabase
      .from("financial_entries")
      .select("id")
      .eq("recurrence_id", recurrence.id)
      .eq("due_date", entry.dueDate)
      .maybeSingle();
    return actionSuccess(
      firstEntry ? (firstEntry.id as FinancialEntryId) : null,
    );
  }

  if (entry.repeat === "installments" && entry.installmentCount) {
    const installmentGroupId = crypto.randomUUID();
    const firstDueDate = parseISO(entry.dueDate);
    const { data: installments, error } = await supabase
      .from("financial_entries")
      .insert(
        Array.from({ length: entry.installmentCount }, (_, index) => ({
          ...values,
          ...(index === 0 ? payment : { paid_at: null, paid_amount: null }),
          organization_id: organizationId,
          due_date: toDateKey(addMonths(firstDueDate, index)),
          installment_group_id: installmentGroupId,
          installment_number: index + 1,
          installment_count: entry.installmentCount,
        })),
      )
      .select("id, installment_number");

    if (error)
      return databaseFailure("Não foi possível salvar as parcelas.", error);
    const firstInstallment = installments.find(
      (installment) => installment.installment_number === 1,
    );
    return actionSuccess(
      firstInstallment ? (firstInstallment.id as FinancialEntryId) : null,
    );
  }

  const { data: createdEntry, error } = await supabase
    .from("financial_entries")
    .insert({
      ...values,
      ...payment,
      organization_id: organizationId,
      due_date: entry.dueDate,
    })
    .select("id")
    .single();

  if (error)
    return databaseFailure("Não foi possível salvar o lançamento.", error);
  return actionSuccess(createdEntry.id as FinancialEntryId);
}

export async function updateFinancialEntry(
  organizationId: OrganizationId,
  entryId: FinancialEntryId,
  input: EntryInput,
  scope: EntryEditScope,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const parsedInput = entrySchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const entry = parsedInput.data;
  const values = toEntryValues(entry);
  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("financial_entries")
    .select(
      "recurrence_id, installment_group_id, installment_number, installment_count, due_date, paid_at",
    )
    .eq("id", entryId)
    .eq("organization_id", organizationId)
    .single();

  if (currentError)
    return databaseFailure("Lançamento não encontrado.", currentError);

  if (current.installment_group_id && current.installment_number) {
    const installmentResult = await updateInstallments(
      organizationId,
      {
        groupId: current.installment_group_id,
        number: current.installment_number,
        count: current.installment_count ?? current.installment_number,
      },
      entry.installmentCount,
    );
    if (installmentResult.status === "error") return installmentResult;
  }

  const { error } = await supabase
    .from("financial_entries")
    .update({
      ...values,
      due_date: entry.dueDate,
    })
    .eq("id", entryId)
    .eq("organization_id", organizationId);

  if (error)
    return databaseFailure("Não foi possível salvar o lançamento.", error);
  if (scope !== "following") return actionSuccess();

  const sharedValues = {
    description: values.description,
    amount: values.amount,
    category_id: values.category_id,
    supplier_id: values.supplier_id,
    notes: values.notes,
  };

  if (current.recurrence_id) {
    const firstChangedDate =
      entry.dueDate < current.due_date ? entry.dueDate : current.due_date;
    const { error: deleteError } = await supabase
      .from("financial_entries")
      .delete()
      .eq("recurrence_id", current.recurrence_id)
      .is("paid_at", null)
      .neq("id", entryId)
      .gte("due_date", firstChangedDate);

    if (deleteError) {
      return databaseFailure(
        "Este lançamento foi salvo, mas os próximos não. Tente de novo.",
        deleteError,
      );
    }

    const { error: recurrenceError } = await supabase
      .from("financial_recurrences")
      .update({
        ...sharedValues,
        ...(entry.frequency ? { frequency: entry.frequency } : {}),
        start_date: entry.dueDate,
        end_date: entry.endDate || null,
        generated_until: entry.dueDate,
      })
      .eq("id", current.recurrence_id);

    if (recurrenceError) {
      return databaseFailure(
        "Este lançamento foi salvo, mas a repetição não. Confira a data de fim.",
        recurrenceError,
      );
    }

    const clock = await getOrganizationClock(organizationId);
    if (clock) await syncRecurrences(organizationId, clock.today);
    return actionSuccess();
  }

  if (current.installment_group_id && current.installment_number) {
    const { data: followingInstallments, error: followingError } =
      await supabase
        .from("financial_entries")
        .select("id, installment_number")
        .eq("installment_group_id", current.installment_group_id)
        .is("paid_at", null)
        .gt("installment_number", current.installment_number);

    if (followingError) {
      return databaseFailure(
        "Esta parcela foi salva, mas as próximas não. Tente de novo.",
        followingError,
      );
    }

    const baseDueDate = parseISO(entry.dueDate);
    const currentNumber = current.installment_number;
    const results = await Promise.all(
      followingInstallments.map((installment) =>
        supabase
          .from("financial_entries")
          .update({
            ...sharedValues,
            due_date: toDateKey(
              addMonths(
                baseDueDate,
                (installment.installment_number ?? currentNumber) -
                  currentNumber,
              ),
            ),
          })
          .eq("id", installment.id),
      ),
    );

    if (results.some((result) => result.error)) {
      return actionFailure(
        "Esta parcela foi salva, mas algumas das próximas não. Tente de novo.",
      );
    }
  }

  return actionSuccess();
}

type InstallmentPosition = {
  groupId: string;
  number: number;
  count: number;
};

async function updateInstallments(
  organizationId: OrganizationId,
  position: InstallmentPosition,
  nextCount: number | undefined,
): Promise<ActionResult> {
  if (!nextCount || nextCount === position.count) return actionSuccess();

  const supabase = await createClient();
  const { data: installments, error } = await supabase
    .from("financial_entries")
    .select(
      "id, installment_number, paid_at, due_date, kind, description, amount, category_id, supplier_id, account_id, notes",
    )
    .eq("installment_group_id", position.groupId)
    .eq("organization_id", organizationId)
    .order("installment_number");

  if (error || installments.length === 0) {
    return actionFailure("Não foi possível alterar as parcelas.");
  }

  const highestPaidNumber = Math.max(
    0,
    ...installments
      .filter((installment) => installment.paid_at)
      .map((installment) => installment.installment_number ?? 0),
  );
  const minimumCount = Math.max(highestPaidNumber, position.number);
  if (nextCount < minimumCount) {
    return actionFailure(
      `Não dá para ter menos de ${minimumCount} parcelas: essa parcela ou as anteriores já existem ou foram pagas.`,
    );
  }

  if (nextCount < position.count) {
    const { error: deleteError } = await supabase
      .from("financial_entries")
      .delete()
      .eq("installment_group_id", position.groupId)
      .gt("installment_number", nextCount);

    if (deleteError)
      return databaseFailure("Não foi possível remover parcelas.", deleteError);
  }

  const { error: countError } = await supabase
    .from("financial_entries")
    .update({ installment_count: nextCount })
    .eq("installment_group_id", position.groupId);

  if (countError)
    return databaseFailure("Não foi possível alterar as parcelas.", countError);

  if (nextCount > position.count) {
    const lastInstallment = installments[installments.length - 1];
    const lastNumber = lastInstallment.installment_number ?? position.count;
    const lastDueDate = parseISO(lastInstallment.due_date);
    const { error: insertError } = await supabase
      .from("financial_entries")
      .insert(
        Array.from({ length: nextCount - lastNumber }, (_, index) => ({
          organization_id: organizationId,
          kind: lastInstallment.kind,
          description: lastInstallment.description,
          amount: lastInstallment.amount,
          category_id: lastInstallment.category_id,
          supplier_id: lastInstallment.supplier_id,
          account_id: lastInstallment.account_id,
          notes: lastInstallment.notes,
          due_date: toDateKey(addMonths(lastDueDate, index + 1)),
          installment_group_id: position.groupId,
          installment_number: lastNumber + index + 1,
          installment_count: nextCount,
        })),
      );

    if (insertError)
      return actionFailure("Não foi possível criar as parcelas.");
  }

  return actionSuccess();
}

export async function payFinancialEntry(
  organizationId: OrganizationId,
  entryId: FinancialEntryId,
  input: PayEntryInput,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const parsedInput = payEntrySchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const accountId = await getDefaultAccountId(organizationId);
  if (!accountId)
    return actionFailure("Não foi possível registrar o pagamento.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_entries")
    .update({
      paid_at: parsedInput.data.paidAt,
      paid_amount: parsedInput.data.paidAmount,
      account_id: accountId,
    })
    .eq("id", entryId)
    .eq("organization_id", organizationId);

  if (error)
    return databaseFailure("Não foi possível registrar o pagamento.", error);
  return actionSuccess();
}

export async function undoFinancialEntryPayment(
  organizationId: OrganizationId,
  entryId: FinancialEntryId,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_entries")
    .update({ paid_at: null, paid_amount: null })
    .eq("id", entryId)
    .eq("organization_id", organizationId);

  if (error)
    return databaseFailure("Não foi possível desfazer o pagamento.", error);
  return actionSuccess();
}
