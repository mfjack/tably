import { format, parseISO } from "date-fns";
import { PAYMENT_METHOD_VALUES } from "@/features/orders/payment-methods";
import type { PaymentMethod } from "@/features/orders/types";
import { formatWeekdayAndDate } from "@/lib/format-date";
import type {
  ProductSales,
  SalesByHour,
  SalesByOperatorPayment,
  SalesReport,
} from "./types";

export const RANKING_SIZE = 5;
export const NO_OPERATOR_LABEL = "Sem operador";
export const MIN_DAYS_FOR_WEEKDAY_CHART = 7;

export const WEEKDAY_LABELS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;

export type PaymentTotals = Record<
  PaymentMethod,
  { revenue: number; orderCount: number }
>;

export type OperatorClosing = {
  operatorName: string;
  payments: PaymentTotals;
  revenue: number;
  orderCount: number;
};

export function getChange(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null;
}

export function getAverageTicket(report: SalesReport): number {
  return report.summary.orderCount > 0
    ? report.summary.revenue / report.summary.orderCount
    : 0;
}

export function getGrossProfit(report: SalesReport): number {
  return report.summary.revenue - report.summary.cost;
}

export function getTotalFees(report: SalesReport): number {
  return report.byPaymentMethod.reduce(
    (total, payment) => total + payment.fee,
    0,
  );
}

export function getTotalSurcharge(report: SalesReport): number {
  return report.byPaymentMethod.reduce(
    (total, payment) => total + payment.surcharge,
    0,
  );
}

export function getNetRevenue(report: SalesReport): number {
  return (
    report.summary.revenue + getTotalSurcharge(report) - getTotalFees(report)
  );
}

export function getPaymentMethodSurcharge(
  report: SalesReport,
  method: PaymentMethod,
): number {
  return (
    (report.byPaymentMethod.find((payment) => payment.method === method)
      ?.surcharge ?? 0) + sumReceipts(report, method, "surcharge")
  );
}

export function getPaymentMethodFee(
  report: SalesReport,
  method: PaymentMethod,
): number {
  return (
    (report.byPaymentMethod.find((payment) => payment.method === method)?.fee ??
      0) + sumReceipts(report, method, "fee")
  );
}

function sumReceipts(
  report: SalesReport,
  method: PaymentMethod,
  field: "fee" | "surcharge",
): number {
  return report.accountReceipts
    .filter((receipt) => receipt.method === method)
    .reduce((total, receipt) => total + receipt[field], 0);
}

export function getCostShare(cost: number, revenue: number): number | null {
  return cost > 0 && revenue > 0 ? cost / revenue : null;
}

function createEmptyPaymentTotals(): PaymentTotals {
  return {
    credit_card: { revenue: 0, orderCount: 0 },
    debit_card: { revenue: 0, orderCount: 0 },
    pix: { revenue: 0, orderCount: 0 },
    cash: { revenue: 0, orderCount: 0 },
    customer_account: { revenue: 0, orderCount: 0 },
  };
}

export function buildPaymentTotals(
  payments: readonly Pick<
    SalesByOperatorPayment,
    "method" | "revenue" | "orderCount"
  >[],
): PaymentTotals {
  const totals = createEmptyPaymentTotals();
  for (const payment of payments) {
    totals[payment.method].revenue += payment.revenue;
    totals[payment.method].orderCount += payment.orderCount;
  }
  return totals;
}

export function sumPaymentTotals(totals: PaymentTotals) {
  return PAYMENT_METHOD_VALUES.reduce(
    (sum, method) => ({
      revenue: sum.revenue + totals[method].revenue,
      orderCount: sum.orderCount + totals[method].orderCount,
    }),
    { revenue: 0, orderCount: 0 },
  );
}

export function getOperatorName(operatorName: string | null): string {
  return operatorName ?? NO_OPERATOR_LABEL;
}

export function getOperatorNames(report: SalesReport): string[] {
  return [
    ...new Set(
      [...report.byOperatorPayment, ...report.accountReceipts].map((payment) =>
        getOperatorName(payment.operatorName),
      ),
    ),
  ].sort((first, second) => first.localeCompare(second, "pt-BR"));
}

export function getOperatorPayments(
  report: SalesReport,
  operatorName: string | null,
): PaymentTotals {
  return buildPaymentTotals(
    operatorName === null
      ? report.byOperatorPayment
      : report.byOperatorPayment.filter(
          (payment) => getOperatorName(payment.operatorName) === operatorName,
        ),
  );
}

export function getOperatorReceipts(
  report: SalesReport,
  operatorName: string | null,
): PaymentTotals {
  return buildPaymentTotals(
    operatorName === null
      ? report.accountReceipts
      : report.accountReceipts.filter(
          (receipt) => getOperatorName(receipt.operatorName) === operatorName,
        ),
  );
}

export function getOperatorClosings(report: SalesReport): OperatorClosing[] {
  return getOperatorNames(report).map((operatorName) => {
    const payments = getOperatorPayments(report, operatorName);
    return { operatorName, payments, ...sumPaymentTotals(payments) };
  });
}

export function getSoldProducts(report: SalesReport): ProductSales[] {
  return report.products.filter((product) => product.quantity > 0);
}

export function getBestSellers(report: SalesReport): ProductSales[] {
  return getSoldProducts(report).slice(0, RANKING_SIZE);
}

export function getWorstSellers(report: SalesReport): ProductSales[] {
  return [...report.products]
    .sort(
      (first, second) =>
        first.quantity - second.quantity ||
        first.revenue - second.revenue ||
        first.productName.localeCompare(second.productName, "pt-BR"),
    )
    .slice(0, RANKING_SIZE);
}

export function formatReportPeriod(report: SalesReport): string {
  if (report.startDate === report.endDate) {
    return formatWeekdayAndDate(parseISO(report.startDate));
  }
  return `${format(parseISO(report.startDate), "dd/MM")} a ${format(parseISO(report.endDate), "dd/MM/yyyy")}`;
}

export function formatReportPeriodForFile(report: SalesReport): string {
  return report.startDate === report.endDate
    ? report.startDate
    : `${report.startDate}-a-${report.endDate}`;
}

export function getPeak<TItem extends { revenue: number }>(
  items: readonly TItem[],
): TItem | null {
  return items.reduce<TItem | null>(
    (peak, item) =>
      item.revenue > 0 && item.revenue > (peak?.revenue ?? 0) ? item : peak,
    null,
  );
}

export function getHourlySeries(report: SalesReport): SalesByHour[] {
  if (report.byHour.length === 0) return [];

  const hours = report.byHour.map((entry) => entry.hour);
  const firstHour = Math.min(...hours);
  const lastHour = Math.max(...hours);

  return Array.from({ length: lastHour - firstHour + 1 }, (_, offset) => {
    const hour = firstHour + offset;
    return (
      report.byHour.find((entry) => entry.hour === hour) ?? {
        hour,
        revenue: 0,
        orderCount: 0,
      }
    );
  });
}

export function formatHour(hour: number): string {
  return `${hour}h`;
}

export function formatHourRange(hour: number): string {
  return `${formatHour(hour)} às ${formatHour((hour + 1) % 24)}`;
}

export function formatWeekday(weekday: number): string {
  return WEEKDAY_LABELS[weekday - 1] ?? "";
}

export function hasWeekdayChart(report: SalesReport): boolean {
  return report.byDay.length >= MIN_DAYS_FOR_WEEKDAY_CHART;
}
