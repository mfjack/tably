"use server";

import { addDays, addMonths, format, parseISO } from "date-fns";
import { z } from "zod";
import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
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
} from "@/lib/action-result";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "@/lib/database-errors";
import { fromSelectFieldValue } from "@/lib/optional-select-value";
import { createClient } from "@/lib/supabase/server";
import { FINANCIAL_DOCUMENTS_BUCKET } from "./documents";
import { DEFAULT_CATEGORIES } from "./labels";
import {
  type AccountInput,
  accountSchema,
  type CategoryInput,
  categorySchema,
  type EntryDeleteScope,
  type EntryEditScope,
  type EntryInput,
  type EntryListFilter,
  entrySchema,
  type PayEntryInput,
  payEntrySchema,
  type TransferInput,
  transferSchema,
} from "./schemas";
import type {
  FinancialAccount,
  FinancialAccountId,
  FinancialCategory,
  FinancialCategoryId,
  FinancialEntriesPage,
  FinancialEntry,
  FinancialEntryId,
  FinancialEntryKind,
  FinancialOverview,
  FinancialRecurrenceId,
  FinancialStatement,
  FinancialTransfer,
  FinancialTransferId,
  StatementLine,
} from "./types";

const SYNC_HORIZON_IN_DAYS = 90;
const UPCOMING_WINDOW_IN_DAYS = 30;
const UPCOMING_LIMIT = 60;
const ACCESS_DENIED = actionFailure(MODULE_ACCESS_DENIED_MESSAGE);

const ENTRY_COLUMNS =
  "id, kind, description, amount, due_date, category_id, supplier_id, account_id, paid_at, paid_amount, recurrence_id, installment_group_id, installment_number, installment_count, barcode, document_path, receipt_path, notes, created_by_name, paid_by_name, category:financial_categories(name), supplier:suppliers(name), account:financial_accounts(name), recurrence:financial_recurrences(frequency, end_date)";

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
  };
}

async function canUseFinance(organizationId: OrganizationId) {
  return hasModuleAccess(organizationId, "finance");
}

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

async function syncRecurrences(organizationId: OrganizationId, today: string) {
  const supabase = await createClient();
  await supabase.rpc("sync_financial_recurrences", {
    p_organization_id: organizationId,
    p_until: toDateKey(addDays(parseISO(today), SYNC_HORIZON_IN_DAYS)),
  });
}

async function ensureFinanceDefaults(organizationId: OrganizationId) {
  const supabase = await createClient();
  const [categoriesResult, accountsResult] = await Promise.all([
    supabase
      .from("financial_categories")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("financial_accounts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  if (categoriesResult.count === 0) {
    await supabase.from("financial_categories").insert(
      (["expense", "income"] as const).flatMap((kind) =>
        DEFAULT_CATEGORIES[kind].map((name) => ({
          organization_id: organizationId,
          kind,
          name,
        })),
      ),
    );
  }

  if (accountsResult.count === 0) {
    await supabase.from("financial_accounts").insert({
      organization_id: organizationId,
      name: "Caixa",
      kind: "cash",
    });
  }
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
  periodIncome: z.number(),
  periodExpense: z.number(),
  overduePayables: z.object({ count: z.number(), amount: z.number() }),
  upcomingPayables: z.object({ count: z.number(), amount: z.number() }),
  overdueReceivables: z.object({ count: z.number(), amount: z.number() }),
  upcomingReceivables: z.object({ count: z.number(), amount: z.number() }),
});

export async function getFinancialOverview(
  organizationId: OrganizationId,
  monthKey: string,
): Promise<ActionResult<FinancialOverview & { upcoming: FinancialEntry[] }>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  if (!isMonthKey(monthKey)) return actionFailure("Mês inválido.");

  const clock = await getOrganizationClock(organizationId);
  if (!clock) return actionFailure("Não foi possível carregar o financeiro.");

  await ensureFinanceDefaults(organizationId);
  await syncRecurrences(organizationId, clock.today);

  const supabase = await createClient();
  const [overviewResult, upcomingResult] = await Promise.all([
    supabase.rpc("get_financial_overview", {
      p_organization_id: organizationId,
      p_from: getMonthStart(monthKey),
      p_to: getMonthEnd(monthKey),
    }),
    supabase
      .from("financial_entries")
      .select(ENTRY_COLUMNS)
      .eq("organization_id", organizationId)
      .is("paid_at", null)
      .lte(
        "due_date",
        toDateKey(addDays(parseISO(clock.today), UPCOMING_WINDOW_IN_DAYS)),
      )
      .order("due_date")
      .limit(UPCOMING_LIMIT),
  ]);

  const parsedOverview = overviewSchema.safeParse(overviewResult.data);
  if (overviewResult.error || upcomingResult.error || !parsedOverview.success) {
    return actionFailure("Não foi possível carregar o financeiro.");
  }

  const overview = parsedOverview.data;
  return actionSuccess({
    ...overview,
    accounts: overview.accounts.map((account) => ({
      ...account,
      id: account.id as FinancialAccountId,
    })),
    upcoming: upcomingResult.data.map(toFinancialEntry),
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
  await syncRecurrences(organizationId, clock.today);

  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
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
  if (error) return actionFailure("Não foi possível carregar os lançamentos.");

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
    account_id:
      fromSelectFieldValue<FinancialAccountId>(input.accountId) ?? null,
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
  const values = toEntryValues(entry);
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

    if (error) return actionFailure("Não foi possível salvar a recorrência.");

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

    if (error) return actionFailure("Não foi possível salvar as parcelas.");
    return actionSuccess();
  }

  const { error } = await supabase.from("financial_entries").insert({
    ...values,
    ...payment,
    organization_id: organizationId,
    due_date: entry.dueDate,
    barcode: entry.digitableLine || null,
  });

  if (error) return actionFailure("Não foi possível salvar o lançamento.");
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

  if (currentError) return actionFailure("Lançamento não encontrado.");

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

  const accountId = current.paid_at
    ? (values.account_id ?? undefined)
    : values.account_id;
  const { error } = await supabase
    .from("financial_entries")
    .update({
      ...values,
      account_id: accountId,
      due_date: entry.dueDate,
      barcode: entry.digitableLine || null,
    })
    .eq("id", entryId)
    .eq("organization_id", organizationId);

  if (error) return actionFailure("Não foi possível salvar o lançamento.");
  if (scope !== "following") return actionSuccess();

  const sharedValues = {
    description: values.description,
    amount: values.amount,
    category_id: values.category_id,
    supplier_id: values.supplier_id,
    account_id: values.account_id,
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
      return actionFailure(
        "Este lançamento foi salvo, mas os próximos não. Tente de novo.",
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
      return actionFailure(
        "Este lançamento foi salvo, mas a repetição não. Confira a data de fim.",
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
      return actionFailure(
        "Esta parcela foi salva, mas as próximas não. Tente de novo.",
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

    if (deleteError) return actionFailure("Não foi possível remover parcelas.");
  }

  const { error: countError } = await supabase
    .from("financial_entries")
    .update({ installment_count: nextCount })
    .eq("installment_group_id", position.groupId);

  if (countError) return actionFailure("Não foi possível alterar as parcelas.");

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

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_entries")
    .update({
      paid_at: parsedInput.data.paidAt,
      paid_amount: parsedInput.data.paidAmount,
      account_id: parsedInput.data.accountId,
    })
    .eq("id", entryId)
    .eq("organization_id", organizationId);

  if (error) return actionFailure("Não foi possível registrar o pagamento.");
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

  if (error) return actionFailure("Não foi possível desfazer o pagamento.");
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

  if (currentError) return actionFailure("Lançamento não encontrado.");

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

    if (error) return actionFailure("Não foi possível excluir os lançamentos.");

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
      return actionFailure("Não foi possível encerrar a recorrência.");
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

    if (error) return actionFailure("Não foi possível excluir as parcelas.");
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

  if (error) return actionFailure("Não foi possível excluir o lançamento.");
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

  if (currentError) return actionFailure("Lançamento não encontrado.");

  const { error } = await supabase
    .from("financial_entries")
    .update(
      field === "document" ? { document_path: path } : { receipt_path: path },
    )
    .eq("id", entryId)
    .eq("organization_id", organizationId);

  if (error) return actionFailure("Não foi possível salvar o anexo.");

  const previousPath = current[column];
  if (previousPath && previousPath !== path) {
    await removeDocuments([previousPath]);
  }
  return actionSuccess();
}

export async function getFinancialStatement(
  organizationId: OrganizationId,
  monthKey: string,
  accountId: FinancialAccountId | null,
): Promise<ActionResult<FinancialStatement>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  if (!isMonthKey(monthKey)) return actionFailure("Mês inválido.");

  const clock = await getOrganizationClock(organizationId);
  if (!clock) return actionFailure("Não foi possível carregar o extrato.");

  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
  const supabase = await createClient();

  let entriesQuery = supabase
    .from("financial_entries")
    .select(ENTRY_COLUMNS)
    .eq("organization_id", organizationId)
    .gte("paid_at", monthStart)
    .lte("paid_at", monthEnd);
  let transfersQuery = supabase
    .from("financial_transfers")
    .select(
      "id, from_account_id, to_account_id, amount, transferred_on, notes, created_by_name, from:financial_accounts!financial_transfers_from_account_id_organization_id_fkey(name), to:financial_accounts!financial_transfers_to_account_id_organization_id_fkey(name)",
    )
    .eq("organization_id", organizationId)
    .gte("transferred_on", monthStart)
    .lte("transferred_on", monthEnd);

  if (accountId) {
    entriesQuery = entriesQuery.eq("account_id", accountId);
    transfersQuery = transfersQuery.or(
      `from_account_id.eq.${accountId},to_account_id.eq.${accountId}`,
    );
  }

  const [entriesResult, transfersResult] = await Promise.all([
    entriesQuery,
    transfersQuery,
  ]);

  if (entriesResult.error || transfersResult.error) {
    return actionFailure("Não foi possível carregar o extrato.");
  }

  const entryLines: StatementLine[] = entriesResult.data.map((row) => {
    const entry = toFinancialEntry(row);
    const paidAmount = entry.paidAmount ?? 0;
    return {
      type: "entry",
      date: entry.paidAt ?? entry.dueDate,
      entry,
      signedAmount: entry.kind === "income" ? paidAmount : -paidAmount,
    };
  });

  const transferLines: StatementLine[] = transfersResult.data.map((row) => {
    const transfer: FinancialTransfer = {
      id: row.id as FinancialTransferId,
      fromAccountId: row.from_account_id as FinancialAccountId,
      fromAccountName: row.from?.name ?? "",
      toAccountId: row.to_account_id as FinancialAccountId,
      toAccountName: row.to?.name ?? "",
      amount: row.amount,
      transferredOn: row.transferred_on,
      notes: row.notes,
      createdByName: row.created_by_name,
    };
    const signedAmount = !accountId
      ? 0
      : transfer.toAccountId === accountId
        ? transfer.amount
        : -transfer.amount;
    return {
      type: "transfer",
      date: transfer.transferredOn,
      transfer,
      signedAmount,
    };
  });

  const lines = [...entryLines, ...transferLines].sort((first, second) =>
    second.date.localeCompare(first.date),
  );

  return actionSuccess({
    today: clock.today,
    lines,
    income: entryLines
      .filter((line) => line.signedAmount > 0)
      .reduce((total, line) => total + line.signedAmount, 0),
    expense: entryLines
      .filter((line) => line.signedAmount < 0)
      .reduce((total, line) => total - line.signedAmount, 0),
  });
}

export async function listFinancialAccounts(
  organizationId: OrganizationId,
): Promise<ActionResult<FinancialAccount[]>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  await ensureFinanceDefaults(organizationId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_accounts")
    .select("id, name, kind, opening_balance, is_archived")
    .eq("organization_id", organizationId)
    .order("is_archived")
    .order("name");

  if (error) return actionFailure("Não foi possível carregar as contas.");

  return actionSuccess(
    data.map((account) => ({
      id: account.id as FinancialAccountId,
      name: account.name,
      kind: account.kind,
      openingBalance: account.opening_balance,
      isArchived: account.is_archived,
    })),
  );
}

export async function saveFinancialAccount(
  organizationId: OrganizationId,
  accountId: FinancialAccountId | null,
  input: AccountInput,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const parsedInput = accountSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const values = {
    name: parsedInput.data.name,
    kind: parsedInput.data.kind,
    opening_balance: parsedInput.data.openingBalance ?? 0,
  };
  const supabase = await createClient();
  const { error } = accountId
    ? await supabase
        .from("financial_accounts")
        .update(values)
        .eq("id", accountId)
        .eq("organization_id", organizationId)
    : await supabase
        .from("financial_accounts")
        .insert({ ...values, organization_id: organizationId });

  if (error) {
    return actionFailure(
      isUniqueViolation(error)
        ? "Já existe uma conta com esse nome."
        : "Não foi possível salvar a conta.",
    );
  }
  return actionSuccess();
}

export async function setFinancialAccountArchived(
  organizationId: OrganizationId,
  accountId: FinancialAccountId,
  isArchived: boolean,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_accounts")
    .update({ is_archived: isArchived })
    .eq("id", accountId)
    .eq("organization_id", organizationId);

  if (error) return actionFailure("Não foi possível atualizar a conta.");
  return actionSuccess();
}

export async function deleteFinancialAccount(
  organizationId: OrganizationId,
  accountId: FinancialAccountId,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_accounts")
    .delete()
    .eq("id", accountId)
    .eq("organization_id", organizationId);

  if (error) {
    return actionFailure(
      isForeignKeyViolation(error)
        ? "Essa conta já tem movimentações. Arquive em vez de excluir."
        : "Não foi possível excluir a conta.",
    );
  }
  return actionSuccess();
}

export async function listFinancialCategories(
  organizationId: OrganizationId,
): Promise<ActionResult<FinancialCategory[]>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  await ensureFinanceDefaults(organizationId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_categories")
    .select("id, name, kind, is_archived")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) return actionFailure("Não foi possível carregar as categorias.");

  return actionSuccess(
    data.map((category) => ({
      id: category.id as FinancialCategoryId,
      name: category.name,
      kind: category.kind,
      isArchived: category.is_archived,
    })),
  );
}

export async function saveFinancialCategory(
  organizationId: OrganizationId,
  categoryId: FinancialCategoryId | null,
  input: CategoryInput,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const parsedInput = categorySchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const supabase = await createClient();
  const { error } = categoryId
    ? await supabase
        .from("financial_categories")
        .update({ name: parsedInput.data.name })
        .eq("id", categoryId)
        .eq("organization_id", organizationId)
    : await supabase.from("financial_categories").insert({
        organization_id: organizationId,
        name: parsedInput.data.name,
        kind: parsedInput.data.kind,
      });

  if (error) {
    return actionFailure(
      isUniqueViolation(error)
        ? "Já existe uma categoria com esse nome."
        : "Não foi possível salvar a categoria.",
    );
  }
  return actionSuccess();
}

export async function deleteFinancialCategory(
  organizationId: OrganizationId,
  categoryId: FinancialCategoryId,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_categories")
    .delete()
    .eq("id", categoryId)
    .eq("organization_id", organizationId);

  if (error) return actionFailure("Não foi possível excluir a categoria.");
  return actionSuccess();
}

export async function createFinancialTransfer(
  organizationId: OrganizationId,
  input: TransferInput,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const parsedInput = transferSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("financial_transfers").insert({
    organization_id: organizationId,
    from_account_id: parsedInput.data.fromAccountId,
    to_account_id: parsedInput.data.toAccountId,
    amount: parsedInput.data.amount,
    transferred_on: parsedInput.data.transferredOn,
    notes: parsedInput.data.notes || null,
  });

  if (error) return actionFailure("Não foi possível salvar a transferência.");
  return actionSuccess();
}

export async function deleteFinancialTransfer(
  organizationId: OrganizationId,
  transferId: FinancialTransferId,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_transfers")
    .delete()
    .eq("id", transferId)
    .eq("organization_id", organizationId);

  if (error) return actionFailure("Não foi possível excluir a transferência.");
  return actionSuccess();
}
