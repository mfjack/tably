import type { EntryListFilter } from "@/features/finance/schemas";
import { createOptionParser } from "@/lib/search-params";

export const FINANCE_TABS = ["overview", "payables", "analysis"] as const;

export const DEFAULT_FINANCE_TAB =
  "overview" satisfies (typeof FINANCE_TABS)[number];

export const parseFinanceTab = createOptionParser(FINANCE_TABS);

export const ENTRY_STATUS_FILTERS = [
  "open",
  "paid",
] as const satisfies readonly EntryListFilter[];

export type EntryStatusFilter = (typeof ENTRY_STATUS_FILTERS)[number];

export const DEFAULT_ENTRY_STATUS_FILTER = "open" satisfies EntryStatusFilter;

export const parseEntryStatusFilter = createOptionParser(ENTRY_STATUS_FILTERS);
