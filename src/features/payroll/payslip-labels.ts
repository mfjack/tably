import { formatMonthLabel } from "@/features/time-clock/time-utils";
import { formatDateKey } from "@/lib/format";
import type { Payslip, PayslipKind } from "./types";

export const PAYSLIP_KIND_TITLES = {
  monthly: "Holerite",
  vacation: "Recibo de férias",
  thirteenth_first: "13º salário · 1ª parcela",
  thirteenth_second: "13º salário · 2ª parcela",
} as const satisfies Record<PayslipKind, string>;

export function describePayslipPeriod(
  payslip: Pick<Payslip, "kind" | "monthKey" | "details">,
): string {
  const { details } = payslip;
  if (payslip.kind === "vacation" && details.startDate && details.endDate) {
    const soldDays = details.soldDays ? ` + ${details.soldDays} vendidos` : "";
    const acquisition =
      details.acquisitionStart && details.acquisitionEnd
        ? ` · período aquisitivo ${formatDateKey(details.acquisitionStart)} a ${formatDateKey(details.acquisitionEnd)}`
        : "";
    return `${formatDateKey(details.startDate)} a ${formatDateKey(details.endDate)} (${details.days ?? 0} dias${soldDays})${acquisition}`;
  }
  if (payslip.kind !== "monthly" && details.year) {
    return `Ano ${details.year} · ${details.months ?? 0}/12 avos`;
  }
  return formatMonthLabel(payslip.monthKey);
}
