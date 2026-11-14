import type { MeasureUnit } from "@/features/ingredients/types";
import type { SupplierId } from "@/features/suppliers/types";
import type {
  FinancialAccountId,
  FinancialCategoryId,
  FinancialEntry,
  FinancialEntryAttachmentId,
  FinancialEntryId,
  FinancialEntryKind,
  FinancialRecurrenceId,
} from "./types";

export const MONTH_ENTRIES_LIMIT = 300;
export const PURCHASE_ORDER_SOURCE_PREFIX = "purchase-order:";
export const INVOICE_SOURCE_PREFIX = "nfe:";

export const ENTRY_COLUMNS =
  "id, kind, description, amount, due_date, category_id, supplier_id, account_id, paid_at, paid_amount, recurrence_id, installment_group_id, installment_number, installment_count, barcode, notes, created_by_name, paid_by_name, source, category:financial_categories(name), supplier:suppliers(name), account:financial_accounts(name), recurrence:financial_recurrences(frequency, end_date), attachments:financial_entry_attachments(id, path, file_name, created_at), source_key, stock_entries(quantity, total_cost, ingredient:ingredients(name, unit))";

export type EntryRow = {
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
  notes: string | null;
  created_by_name: string | null;
  paid_by_name: string | null;
  source: FinancialEntry["source"];
  source_key: string | null;
  stock_entries: {
    quantity: number;
    total_cost: number;
    ingredient: { name: string; unit: MeasureUnit } | null;
  }[];
  category: { name: string } | null;
  supplier: { name: string } | null;
  account: { name: string } | null;
  recurrence: {
    frequency: FinancialEntry["recurrenceFrequency"];
    end_date: string | null;
  } | null;
  attachments: {
    id: string;
    path: string;
    file_name: string;
    created_at: string;
  }[];
};

export function toFinancialEntry(row: EntryRow): FinancialEntry {
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
    attachments: [...row.attachments]
      .sort((first, second) =>
        first.created_at.localeCompare(second.created_at),
      )
      .map((attachment) => ({
        id: attachment.id as FinancialEntryAttachmentId,
        path: attachment.path,
        fileName: attachment.file_name,
      })),
    notes: row.notes,
    createdByName: row.created_by_name,
    paidByName: row.paid_by_name,
    source: row.source,
    purchasedItemCount: row.source_key?.startsWith(PURCHASE_ORDER_SOURCE_PREFIX)
      ? 0
      : row.stock_entries.length,
    purchasedItems: row.stock_entries.map((stockEntry) => ({
      name: stockEntry.ingredient?.name ?? "Item removido",
      unit: stockEntry.ingredient?.unit ?? null,
      quantity: stockEntry.quantity,
      totalCost: stockEntry.total_cost,
    })),
  };
}
