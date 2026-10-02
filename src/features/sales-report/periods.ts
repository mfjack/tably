import { Constants } from "@/lib/supabase/database.types";
import type { SalesReportPeriod } from "./types";

export const SALES_REPORT_PERIOD_LABELS = {
  today: "Hoje",
  yesterday: "Ontem",
  last_7_days: "7 dias",
  last_30_days: "30 dias",
  this_month: "Este mês",
  last_month: "Mês passado",
} as const satisfies Record<SalesReportPeriod, string>;

export const SALES_REPORT_PERIODS = Constants.public.Enums.sales_report_period;

export const DEFAULT_SALES_REPORT_PERIOD: SalesReportPeriod = "today";

export function isSalesReportPeriod(value: string): value is SalesReportPeriod {
  return SALES_REPORT_PERIODS.some((period) => period === value);
}

export function toSalesReportPeriod(
  value: string | string[] | undefined,
): SalesReportPeriod {
  return typeof value === "string" && isSalesReportPeriod(value)
    ? value
    : DEFAULT_SALES_REPORT_PERIOD;
}
