import type { SupplierId } from "@/features/suppliers/types";
import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type FinancialAccountId = Brand<string, "FinancialAccountId">;
export type FinancialCategoryId = Brand<string, "FinancialCategoryId">;
export type FinancialEntryId = Brand<string, "FinancialEntryId">;
export type FinancialRecurrenceId = Brand<string, "FinancialRecurrenceId">;
export type FinancialTransferId = Brand<string, "FinancialTransferId">;

export type FinancialAccountKind =
  Database["public"]["Enums"]["financial_account_kind"];
export type FinancialEntryKind =
  Database["public"]["Enums"]["financial_entry_kind"];
export type FinancialEntrySource =
  Database["public"]["Enums"]["financial_entry_source"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type RecurrenceFrequency =
  Database["public"]["Enums"]["recurrence_frequency"];

export type FinancialAccount = {
  id: FinancialAccountId;
  name: string;
  kind: FinancialAccountKind;
  openingBalance: number;
  isArchived: boolean;
};

export type FinancialAccountBalance = {
  id: FinancialAccountId;
  name: string;
  kind: FinancialAccountKind;
  isArchived: boolean;
  balance: number;
};

export type FinancialCategory = {
  id: FinancialCategoryId;
  name: string;
  kind: FinancialEntryKind;
  isArchived: boolean;
};

export type EntryStatus = "paid" | "overdue" | "due_today" | "open";

export type FinancialEntry = {
  id: FinancialEntryId;
  kind: FinancialEntryKind;
  description: string;
  amount: number;
  dueDate: string;
  categoryId: FinancialCategoryId | null;
  categoryName: string | null;
  supplierId: SupplierId | null;
  supplierName: string | null;
  accountId: FinancialAccountId | null;
  accountName: string | null;
  paidAt: string | null;
  paidAmount: number | null;
  recurrenceId: FinancialRecurrenceId | null;
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceEndDate: string | null;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  digitableLine: string | null;
  documentPath: string | null;
  receiptPath: string | null;
  notes: string | null;
  createdByName: string | null;
  paidByName: string | null;
  source: FinancialEntrySource;
};

export type FinancialEntriesPage = {
  today: string;
  entries: FinancialEntry[];
};

export type EntryTotals = {
  count: number;
  amount: number;
};

export type FinancialOverview = {
  today: string;
  firstMonthKey: string;
  accounts: FinancialAccountBalance[];
  periodIncome: number;
  periodExpense: number;
  overduePayables: EntryTotals;
  monthPayables: EntryTotals;
  overdueReceivables: EntryTotals;
  monthReceivables: EntryTotals;
  monthFixedExpenses: EntryTotals & { paidAmount: number; openCount: number };
};
