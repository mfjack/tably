"use server";

import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  ACCESS_DENIED,
  canUseFinance,
  getDefaultAccountId,
} from "../finance-core";
import { type FinanceImportRow, financeImportSchema } from "./schemas";

export type FinanceImportPreviewRow = {
  isDuplicate: boolean;
  hasUnknownCategory: boolean;
  hasUnknownSupplier: boolean;
};

export type FinanceImportResult = {
  importedCount: number;
  duplicateCount: number;
};

type ImportContext = {
  categoryIds: ReadonlyMap<string, string>;
  supplierIds: ReadonlyMap<string, string>;
  existingKeys: ReadonlySet<string>;
};

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function buildEntryKey(entry: {
  kind: string;
  description: string;
  dueDate: string;
  amount: number;
}): string {
  return [
    entry.kind,
    normalizeName(entry.description),
    entry.dueDate,
    entry.amount.toFixed(2),
  ].join("|");
}

function getCategoryKey(kind: string, name: string): string {
  return `${kind}|${normalizeName(name)}`;
}

async function loadImportContext(
  organizationId: OrganizationId,
  rows: readonly FinanceImportRow[],
): Promise<ImportContext | null> {
  const dueDates = rows.map((row) => row.dueDate).sort();
  const supabase = await createClient();
  const [categories, suppliers, entries] = await Promise.all([
    supabase
      .from("financial_categories")
      .select("id, kind, name")
      .eq("organization_id", organizationId)
      .eq("is_archived", false),
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("organization_id", organizationId),
    supabase
      .from("financial_entries")
      .select("kind, description, due_date, amount")
      .eq("organization_id", organizationId)
      .gte("due_date", dueDates[0])
      .lte("due_date", dueDates[dueDates.length - 1]),
  ]);
  if (categories.error || suppliers.error || entries.error) return null;

  return {
    categoryIds: new Map(
      categories.data.map((category) => [
        getCategoryKey(category.kind, category.name),
        category.id,
      ]),
    ),
    supplierIds: new Map(
      suppliers.data.map((supplier) => [
        normalizeName(supplier.name),
        supplier.id,
      ]),
    ),
    existingKeys: new Set(
      entries.data.map((entry) =>
        buildEntryKey({
          kind: entry.kind,
          description: entry.description,
          dueDate: entry.due_date,
          amount: entry.amount,
        }),
      ),
    ),
  };
}

function findCategoryId(context: ImportContext, row: FinanceImportRow) {
  return row.categoryName
    ? context.categoryIds.get(getCategoryKey(row.kind, row.categoryName))
    : undefined;
}

function findSupplierId(context: ImportContext, row: FinanceImportRow) {
  return row.kind === "expense" && row.supplierName
    ? context.supplierIds.get(normalizeName(row.supplierName))
    : undefined;
}

async function prepareImport(
  organizationId: OrganizationId,
  rows: readonly FinanceImportRow[],
): Promise<ActionResult<{ rows: FinanceImportRow[]; context: ImportContext }>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  const parsedRows = financeImportSchema.safeParse(rows);
  if (!parsedRows.success) {
    return actionFailure(
      parsedRows.error.issues[0]?.message ?? "Planilha inválida.",
    );
  }
  const context = await loadImportContext(organizationId, parsedRows.data);
  if (!context) return actionFailure("Não foi possível conferir a planilha.");
  return actionSuccess({ rows: parsedRows.data, context });
}

export async function previewFinanceImport(
  organizationId: OrganizationId,
  rows: readonly FinanceImportRow[],
): Promise<ActionResult<FinanceImportPreviewRow[]>> {
  const prepared = await prepareImport(organizationId, rows);
  if (prepared.status === "error") return prepared;

  const { context } = prepared.data;
  return actionSuccess(
    prepared.data.rows.map((row) => ({
      isDuplicate: context.existingKeys.has(buildEntryKey(row)),
      hasUnknownCategory:
        row.categoryName !== "" && !findCategoryId(context, row),
      hasUnknownSupplier:
        row.kind === "expense" &&
        row.supplierName !== "" &&
        !findSupplierId(context, row),
    })),
  );
}

export async function importFinanceEntries(
  organizationId: OrganizationId,
  rows: readonly FinanceImportRow[],
): Promise<ActionResult<FinanceImportResult>> {
  const prepared = await prepareImport(organizationId, rows);
  if (prepared.status === "error") return prepared;

  const accountId = await getDefaultAccountId(organizationId);
  if (!accountId) return actionFailure("Não foi possível importar.");

  const { context } = prepared.data;
  const newRows = prepared.data.rows.filter(
    (row) => !context.existingKeys.has(buildEntryKey(row)),
  );
  const duplicateCount = prepared.data.rows.length - newRows.length;
  if (newRows.length === 0) {
    return actionSuccess({ importedCount: 0, duplicateCount });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("financial_entries").insert(
    newRows.map((row) => ({
      organization_id: organizationId,
      account_id: accountId,
      kind: row.kind,
      description: row.description,
      amount: row.amount,
      due_date: row.dueDate,
      category_id: findCategoryId(context, row) ?? null,
      supplier_id: findSupplierId(context, row) ?? null,
      notes: row.notes || null,
      paid_at: row.paidAt || null,
      paid_amount: row.paidAt ? (row.paidAmount ?? row.amount) : null,
    })),
  );
  if (error) return databaseFailure("Não foi possível importar.", error);

  return actionSuccess({ importedCount: newRows.length, duplicateCount });
}
