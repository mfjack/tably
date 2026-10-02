import { createOptionParser } from "@/lib/search-params";

export const PAYROLL_TABS = ["monthly", "vacations", "thirteenth"] as const;

export const DEFAULT_PAYROLL_TAB =
  "monthly" satisfies (typeof PAYROLL_TABS)[number];

export const parsePayrollTab = createOptionParser(PAYROLL_TABS);
