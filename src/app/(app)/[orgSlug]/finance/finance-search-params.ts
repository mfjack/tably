import { createOptionParser } from "@/lib/search-params";

const FINANCE_TABS = ["overview", "income-statement", "analysis"] as const;

export const DEFAULT_FINANCE_TAB =
  "overview" satisfies (typeof FINANCE_TABS)[number];

export const parseFinanceTab = createOptionParser(FINANCE_TABS);
