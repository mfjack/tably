import { format } from "date-fns";
import {
  PAYMENT_METHOD_VALUES,
  PAYMENT_METHODS,
} from "@/features/orders/payment-methods";
import {
  buildBusinessHeader,
  buildRow,
  TICKET_STYLES,
} from "@/features/orders/print-order-ticket";
import { formatCurrency, formatPercent } from "@/lib/format";
import { escapeHtml, printHtml } from "@/lib/print-html";
import {
  buildPaymentTotals,
  formatHourRange,
  formatReportPeriod,
  formatWeekday,
  getAverageTicket,
  getBestSellers,
  getCostShare,
  getGrossProfit,
  getHourlySeries,
  getOperatorClosings,
  getPeak,
  getWorstSellers,
  hasWeekdayChart,
  type PaymentTotals,
  sumPaymentTotals,
} from "../report-metrics";
import type { ProductSales } from "../types";
import {
  SALES_REPORT_TITLE,
  type SalesReportExportInput,
} from "./export-types";

const REPORT_STYLES = `
  .title { text-align: center; font-weight: 700; font-size: 14px; }
  .muted { font-size: 11px; text-align: center; }
  .heading { font-weight: 700; font-size: 13px; text-transform: uppercase; }
  .operator { font-weight: 700; padding-top: 4px; }
`;

function buildSection(heading: string, content: string): string {
  return `<section><p class="heading">${escapeHtml(heading)}</p>${content}</section>`;
}

function buildPaymentRows(payments: PaymentTotals): string {
  const total = sumPaymentTotals(payments);
  return [
    ...PAYMENT_METHOD_VALUES.filter(
      (method) => payments[method].orderCount > 0,
    ).map((method) =>
      buildRow(
        `${PAYMENT_METHODS[method].label} (${payments[method].orderCount})`,
        formatCurrency(payments[method].revenue),
      ),
    ),
    buildRow("Total", formatCurrency(total.revenue), true),
  ].join("");
}

function buildProductRows(products: readonly ProductSales[]): string {
  if (products.length === 0) return "<p>Nenhum produto.</p>";
  return products
    .map((product) =>
      buildRow(
        `${product.quantity}x ${product.productName}`,
        formatCurrency(product.revenue),
      ),
    )
    .join("");
}

function buildReportHtml({
  report,
  business,
  generatedAt,
}: SalesReportExportInput): string {
  const { summary, canceled } = report;
  const peakHour = getPeak(getHourlySeries(report));
  const peakWeekday = hasWeekdayChart(report)
    ? getPeak(report.byWeekday)
    : null;
  const costShare = getCostShare(summary.cost, summary.revenue);
  const operatorClosings = getOperatorClosings(report);

  const summaryRows = [
    buildRow("Faturamento", formatCurrency(summary.revenue), true),
    buildRow("Pedidos", summary.orderCount.toString()),
    buildRow("Ticket médio", formatCurrency(getAverageTicket(report))),
    buildRow("Itens vendidos", summary.itemCount.toString()),
    summary.takeawayFees > 0
      ? buildRow("Taxa para levar", formatCurrency(summary.takeawayFees))
      : "",
    costShare !== null
      ? buildRow("Lucro bruto", formatCurrency(getGrossProfit(report)))
      : "",
    costShare !== null ? buildRow("CMV", formatPercent(costShare)) : "",
    peakHour ? buildRow("Horário de pico", formatHourRange(peakHour.hour)) : "",
    peakWeekday
      ? buildRow("Dia mais forte", formatWeekday(peakWeekday.weekday))
      : "",
    canceled.orderCount > 0
      ? buildRow(
          `Cancelados (${canceled.orderCount})`,
          formatCurrency(canceled.total),
        )
      : "",
  ].join("");

  const operatorRows = operatorClosings
    .map(
      (closing) =>
        `<p class="operator">${escapeHtml(closing.operatorName)}</p>${buildPaymentRows(closing.payments)}`,
    )
    .join("");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${SALES_REPORT_TITLE}</title><style>${TICKET_STYLES}${REPORT_STYLES}</style></head><body>
    ${buildBusinessHeader(business)}
    <section>
      <p class="title">${SALES_REPORT_TITLE.toUpperCase()}</p>
      <p class="muted">${escapeHtml(formatReportPeriod(report))}</p>
      <p class="muted">Emitido em ${format(generatedAt, "dd/MM/yyyy, HH:mm")}</p>
    </section>
    ${buildSection("Resumo", summaryRows)}
    ${buildSection("Formas de pagamento", buildPaymentRows(buildPaymentTotals(report.byPaymentMethod)))}
    ${report.accountReceipts.length > 0 ? buildSection("Contas recebidas", buildPaymentRows(buildPaymentTotals(report.accountReceipts))) : ""}
    ${operatorClosings.length > 1 ? buildSection("Por operador", operatorRows) : ""}
    ${buildSection("Mais vendidos", buildProductRows(getBestSellers(report)))}
    ${buildSection("Menos vendidos", buildProductRows(getWorstSellers(report)))}
  </body></html>`;
}

export function printThermalSalesReport(input: SalesReportExportInput): void {
  printHtml(buildReportHtml(input));
}
