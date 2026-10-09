"use server";

import { addDays, addMonths, parseISO } from "date-fns";
import * as z from "zod";
import type { OrganizationId } from "@/features/organizations/types";
import type { SupplierId } from "@/features/suppliers/types";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import {
  getMonthEnd,
  getMonthStart,
  isMonthKey,
} from "@/features/time-clock/time-utils";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { fromSelectFieldValue } from "@/lib/optional-select-value";
import { createClient } from "@/lib/supabase/server";
import { FINANCIAL_DOCUMENTS_BUCKET } from "./documents";
import {
  ACCESS_DENIED,
  canUseFinance,
  ensureFinanceDefaults,
  getDefaultAccountId,
  syncRecurrences,
  toDateKey,
} from "./finance-core";
import {
  type EntryDeleteScope,
  type EntryEditScope,
  type EntryInput,
  type EntryListFilter,
  entrySchema,
  type PayEntryInput,
  payEntrySchema,
} from "./schemas";
import type {
  FinancialAccountId,
  FinancialCategoryId,
  FinancialEntriesPage,
  FinancialEntry,
  FinancialEntryId,
  FinancialEntryKind,
  FinancialOverview,
  FinancialRecurrenceId,
} from "./types";

const MONTH_ENTRIES_LIMIT = 300;

const ENTRY_COLUMNS =
  "id, kind, description, amount, due_date, category_id, supplier_id, account_id, paid_at, paid_amount, recurrence_id, installment_group_id, installment_number, installment_count, barcode, document_path, receipt_path, notes, created_by_name, paid_by_name, source, category:financial_categories(name), supplier:suppliers(name), account:financial_accounts(name), recurrence:financial_recurrences(frequency, end_date)";

type EntryRow = {
  id: string;
  kind: FinancialEntryKind;
  description: string;
  amount: number;
  due_date: string;
  category_id: string | null;
  supplier_id: string | null;
  account_id: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  recurrence_id: string | null;
  installment_group_id: string | null;
  installment_number: number | null;
  installment_count: number | null;
  barcode: string | null;
  document_path: string | null;
  receipt_path: string | null;
  notes: string | null;
  created_by_name: string | null;
  paid_by_name: string | null;
  source: FinancialEntry["source"];
  category: { name: string } | null;
  supplier: { name: string } | null;
  account: { name: string } | null;
  recurrence: {
    frequency: FinancialEntry["recurrenceFrequency"];
    end_date: string | null;
  } | null;
};

function toFinancialEntry(row: EntryRow): FinancialEntry {
  return {
    id: row.id as FinancialEntryId,
    kind: row.kind,
    description: row.description,
    amount: row.amount,
    dueDate: row.due_date,
    categoryId: row.category_id as FinancialCategoryId | null,
    categoryName: row.category?.name ?? null,
    supplierId: row.supplier_id as SupplierId | null,
    supplierName: row.supplier?.name ?? null,
    accountId: row.account_id as FinancialAccountId | null,
    accountName: row.account?.name ?? null,
    paidAt: row.paid_at,
    paidAmount: row.paid_amount,
    recurrenceId: row.recurrence_id as FinancialRecurrenceId | null,
    recurrenceFrequency: row.recurrence?.frequency ?? null,
    recurrenceEndDate: row.recurrence?.end_date ?? null,
    installmentGroupId: row.installment_group_id,
    installmentNumber: row.installment_number,
    installmentCount: row.installment_count,
    digitableLine: row.barcode,
    documentPath: row.document_path,
    receiptPath: row.receipt_path,
    notes: row.notes,
    createdByName: row.created_by_name,
    paidByName: row.paid_by_name,
    source: row.source,
  };
}

const overviewSchema = z.object({
  today: z.string(),
  accounts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kind: z.enum(["cash", "bank", "card_acquirer", "digital_wallet"]),
      isArchived: z.boolean(),
      balance: z.number(),
    }),
  ),
  firstMonthKey: z.string(),
  periodIncome: z.number(),
  periodExpense: z.number(),
  overduePayables: z.object({ count: z.number(), amount: z.number() }),
  monthPayables: z.object({ count: z.number(), amount: z.number() }),
  overdueReceivables: z.object({ count: z.number(), amount: z.number() }),
  monthReceivables: z.object({ count: z.number(), amount: z.number() }),
  monthFixedExpenses: z.object({
    count: z.number(),
    amount: z.number(),
    paidAmount: z.number(),
    openCount: z.number(),
  }),
});

export async function getFinancialOverview(
  organizationId: OrganizationId,
  monthKey: string,
): Promise<
  ActionResult<FinancialOverview & { monthEntries: FinancialEntry[] }>
> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  if (!isMonthKey(monthKey)) return actionFailure("Mês inválido.");

  const clock = await getOrganizationClock(organizationId);
  if (!clock) return actionFailure("Não foi possível carregar o financeiro.");

  await ensureFinanceDefaults(organizationId);
  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
  await syncRecurrences(organizationId, clock.today, monthEnd);

  const supabase = await createClient();
  const [overviewResult, monthEntriesResult] = await Promise.all([
    supabase.rpc("get_financial_overview", {
      p_organization_id: organizationId,
      p_from: monthStart,
      p_to: monthEnd,
    }),
    supabase
      .from("financial_entries")
      .select(ENTRY_COLUMNS)
      .eq("organization_id", organizationId)
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd)
      .order("due_date")
      .order("created_at")
      .limit(MONTH_ENTRIES_LIMIT),
  ]);

  const parsedOverview = overviewSchema.safeParse(overviewResult.data);
  if (
    overviewResult.error ||
    monthEntriesResult.error ||
    !parsedOverview.success
  ) {
    return actionFailure("Não foi possível carregar o financeiro.");
  }

  const overview = parsedOverview.data;
  return actionSuccess({
    ...overview,
    accounts: overview.accounts.map((account) => ({
      ...account,
      id: account.id as FinancialAccountId,
    })),
    monthEntries: monthEntriesResult.data.map(toFinancialEntry),
  });
}

export async function listFinancialEntries(
  organizationId: OrganizationId,
  kind: FinancialEntryKind,
  monthKey: string,
  filter: EntryListFilter,
): Promise<ActionResult<FinancialEntriesPage>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  if (!isMonthKey(monthKey)) return actionFailure("Mês inválido.");

  const clock = await getOrganizationClock(organizationId);
  if (!clock) return actionFailure("Não foi possível carregar os lançamentos.");

  await ensureFinanceDefaults(organizationId);
  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
  await syncRecurrences(organizationId, clock.today, monthEnd);

  const supabase = await createClient();
  let query = supabase
    .from("financial_entries")
    .select(ENTRY_COLUMNS)
    .eq("organization_id", organizationId)
    .eq("kind", kind);

  if (filter === "open") {
    query = query
      .is("paid_at", null)
      .or(
        `and(due_date.gte.${monthStart},due_date.lte.${monthEnd}),due_date.lt.${clock.today}`,
      )
      .order("due_date");
  } else if (filter === "paid") {
    query = query
      .gte("paid_at", monthStart)
      .lte("paid_at", monthEnd)
      .order("paid_at", { ascending: false });
  } else {
    query = query
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd)
      .order("due_date");
  }

  const { data, error } = await query;
  if (error)
    return databaseFailure("Não foi possível carregar os lançamentos.", error);

  return actionSuccess({
    today: clock.today,
    entries: data.map(toFinancialEntry),
  });
}

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
): Promise<ActionResult> {
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
    return actionSuccess();
  }

  if (entry.repeat === "installments" && entry.installmentCount) {
    const installmentGroupId = crypto.randomUUID();
    const firstDueDate = parseISO(entry.dueDate);
    const { error } = await supabase.from("financial_entries").insert(
      Array.from({ length: entry.installmentCount }, (_, index) => ({
        ...values,
        ...(index === 0 ? payment : { paid_at: null, paid_amount: null }),
        organization_id: organizationId,
        due_date: toDateKey(addMonths(firstDueDate, index)),
        installment_group_id: installmentGroupId,
        installment_number: index + 1,
        installment_count: entry.installmentCount,
        barcode: index === 0 ? entry.digitableLine || null : null,
      })),
    );

    if (error)
      return databaseFailure("Não foi possível salvar as parcelas.", error);
    return actionSuccess();
  }

  const { error } = await supabase.from("financial_entries").insert({
    ...values,
    ...payment,
    organization_id: organizationId,
    due_date: entry.dueDate,
    barcode: entry.digitableLine || null,
  });

  if (error)
    return databaseFailure("Não foi possível salvar o lançamento.", error);
  return actionSuccess();
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
      barcode: entry.digitableLine || null,
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

async function removeDocuments(paths: readonly (string | null)[]) {
  const existingPaths = paths.filter((path) => path !== null);
  if (existingPaths.length === 0) return;
  const supabase = await createClient();
  await supabase.storage.from(FINANCIAL_DOCUMENTS_BUCKET).remove(existingPaths);
}

export async function deleteFinancialEntry(
  organizationId: OrganizationId,
  entryId: FinancialEntryId,
  scope: EntryDeleteScope,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("financial_entries")
    .select(
      "recurrence_id, installment_group_id, due_date, document_path, receipt_path",
    )
    .eq("id", entryId)
    .eq("organization_id", organizationId)
    .single();

  if (currentError)
    return databaseFailure("Lançamento não encontrado.", currentError);

  if (scope === "all" && current.recurrence_id) {
    const { data: removed, error } = await supabase
      .from("financial_entries")
      .delete()
      .eq("recurrence_id", current.recurrence_id)
      .or(`paid_at.is.null,id.eq.${entryId}`)
      .select("document_path, receipt_path");

    if (error)
      return databaseFailure("Não foi possível excluir a conta.", error);

    const { error: recurrenceError } = await supabase
      .from("financial_recurrences")
      .delete()
      .eq("id", current.recurrence_id);

    if (recurrenceError) {
      return databaseFailure(
        "Não foi possível excluir a repetição.",
        recurrenceError,
      );
    }

    await removeDocuments(
      removed.flatMap((row) => [row.document_path, row.receipt_path]),
    );
    return actionSuccess();
  }

  if (scope === "following" && current.recurrence_id) {
    const { data: recurrence } = await supabase
      .from("financial_recurrences")
      .select("start_date")
      .eq("id", current.recurrence_id)
      .single();

    const { data: removed, error } = await supabase
      .from("financial_entries")
      .delete()
      .eq("recurrence_id", current.recurrence_id)
      .gte("due_date", current.due_date)
      .or(`paid_at.is.null,id.eq.${entryId}`)
      .select("document_path, receipt_path");

    if (error)
      return databaseFailure("Não foi possível excluir os lançamentos.", error);

    const endDate = toDateKey(addDays(parseISO(current.due_date), -1));
    const recurrenceUpdate =
      recurrence && endDate >= recurrence.start_date
        ? supabase
            .from("financial_recurrences")
            .update({ end_date: endDate })
            .eq("id", current.recurrence_id)
        : supabase
            .from("financial_recurrences")
            .delete()
            .eq("id", current.recurrence_id);
    const { error: recurrenceError } = await recurrenceUpdate;
    if (recurrenceError) {
      return databaseFailure(
        "Não foi possível encerrar a recorrência.",
        recurrenceError,
      );
    }

    await removeDocuments(
      removed.flatMap((row) => [row.document_path, row.receipt_path]),
    );
    return actionSuccess();
  }

  if (scope === "installments" && current.installment_group_id) {
    const { data: removed, error } = await supabase
      .from("financial_entries")
      .delete()
      .eq("installment_group_id", current.installment_group_id)
      .or(`paid_at.is.null,id.eq.${entryId}`)
      .select("document_path, receipt_path");

    if (error)
      return databaseFailure("Não foi possível excluir as parcelas.", error);
    await removeDocuments(
      removed.flatMap((row) => [row.document_path, row.receipt_path]),
    );
    return actionSuccess();
  }

  const { error } = await supabase
    .from("financial_entries")
    .delete()
    .eq("id", entryId)
    .eq("organization_id", organizationId);

  if (error)
    return databaseFailure("Não foi possível excluir o lançamento.", error);
  await removeDocuments([current.document_path, current.receipt_path]);
  return actionSuccess();
}

export async function setFinancialEntryDocument(
  organizationId: OrganizationId,
  entryId: FinancialEntryId,
  field: "document" | "receipt",
  path: string | null,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  if (path !== null && !path.startsWith(`${organizationId}/`)) {
    return actionFailure("Arquivo inválido.");
  }

  const column = field === "document" ? "document_path" : "receipt_path";
  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("financial_entries")
    .select("document_path, receipt_path")
    .eq("id", entryId)
    .eq("organization_id", organizationId)
    .single();

  if (currentError)
    return databaseFailure("Lançamento não encontrado.", currentError);

  const { error } = await supabase
    .from("financial_entries")
    .update(
      field === "document" ? { document_path: path } : { receipt_path: path },
    )
    .eq("id", entryId)
    .eq("organization_id", organizationId);

  if (error) return databaseFailure("Não foi possível salvar o anexo.", error);

  const previousPath = current[column];
  if (previousPath && previousPath !== path) {
    await removeDocuments([previousPath]);
  }
  return actionSuccess();
}
