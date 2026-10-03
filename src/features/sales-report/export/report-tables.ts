import { format, parseISO } from "date-fns";
import {
  PAYMENT_METHOD_VALUES,
  PAYMENT_METHODS,
  RECEIVABLE_PAYMENT_METHOD_VALUES,
} from "@/features/orders/payment-methods";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  buildPaymentTotals,
  formatHourRange,
  formatWeekday,
  getAverageTicket,
  getBestSellers,
  getCostShare,
  getGrossProfit,
  getHourlySeries,
  getNetRevenue,
  getOperatorClosings,
  getTotalFees,
  getWorstSellers,
  hasWeekdayChart,
  sumPaymentTotals,
} from "../report-metrics";
import type { ProductSales, SalesReport } from "../types";

export type ReportCellKind = "text" | "number" | "currency" | "percent";

export type ReportCell = {
  value: string | number | null;
  kind: ReportCellKind;
};

export type ReportTable = {
  title: string;
  headers: string[];
  rows: ReportCell[][];
  footer?: ReportCell[];
};

function text(value: string): ReportCell {
  return { value, kind: "text" };
}

function count(value: number): ReportCell {
  return { value, kind: "number" };
}

function money(value: number): ReportCell {
  return { value, kind: "currency" };
}

function percent(value: number | null): ReportCell {
  return { value, kind: "percent" };
}

export function formatReportCell(cell: ReportCell): string {
  if (cell.value === null) return "—";
  if (typeof cell.value === "string") return cell.value;
  if (cell.kind === "currency") return formatCurrency(cell.value);
  if (cell.kind === "percent") return formatPercent(cell.value);
  return cell.value.toString();
}

function buildSummaryTable(report: SalesReport): ReportTable {
  const { summary, previousSummary, canceled } = report;
  const costShare = getCostShare(summary.cost, summary.revenue);

  return {
    title: "Resumo",
    headers: ["Indicador", "Valor"],
    rows: [
      [text("Faturamento"), money(summary.revenue)],
      [text("Taxas de pagamento"), money(getTotalFees(report))],
      [text("Valor a receber"), money(getNetRevenue(report))],
      [text("Faturamento do período anterior"), money(previousSummary.revenue)],
      [text("Pedidos"), count(summary.orderCount)],
      [text("Pedidos do período anterior"), count(previousSummary.orderCount)],
      [text("Ticket médio"), money(getAverageTicket(report))],
      [text("Itens vendidos"), count(summary.itemCount)],
      [text("Taxa para levar"), money(summary.takeawayFees)],
      [
        text("Custo dos produtos (CMV)"),
        costShare === null ? percent(null) : money(summary.cost),
      ],
      [text("CMV sobre o faturamento"), percent(costShare)],
      [
        text("Lucro bruto"),
        costShare === null ? percent(null) : money(getGrossProfit(report)),
      ],
      [text("Pedidos cancelados"), count(canceled.orderCount)],
      [text("Valor cancelado"), money(canceled.total)],
    ],
  };
}

function buildPaymentsTable(report: SalesReport): ReportTable {
  const totals = buildPaymentTotals(report.byPaymentMethod);
  const grandTotal = sumPaymentTotals(totals);

  return {
    title: "Formas de pagamento",
    headers: ["Forma de pagamento", "Pedidos", "Valor", "Participação"],
    rows: PAYMENT_METHOD_VALUES.map((method) => [
      text(PAYMENT_METHODS[method].label),
      count(totals[method].orderCount),
      money(totals[method].revenue),
      percent(
        grandTotal.revenue > 0
          ? totals[method].revenue / grandTotal.revenue
          : null,
      ),
    ]),
    footer: [
      text("Total"),
      count(grandTotal.orderCount),
      money(grandTotal.revenue),
      percent(grandTotal.revenue > 0 ? 1 : null),
    ],
  };
}

function buildReceiptsTable(report: SalesReport): ReportTable {
  const totals = buildPaymentTotals(report.accountReceipts);
  const grandTotal = sumPaymentTotals(totals);

  return {
    title: "Contas recebidas",
    headers: ["Forma de pagamento", "Recebimentos", "Valor"],
    rows: RECEIVABLE_PAYMENT_METHOD_VALUES.map((method) => [
      text(PAYMENT_METHODS[method].label),
      count(totals[method].orderCount),
      money(totals[method].revenue),
    ]),
    footer: [
      text("Total"),
      count(grandTotal.orderCount),
      money(grandTotal.revenue),
    ],
  };
}

function buildOperatorsTable(report: SalesReport): ReportTable {
  return {
    title: "Fechamento por operador",
    headers: [
      "Operador",
      ...PAYMENT_METHOD_VALUES.map((method) => PAYMENT_METHODS[method].label),
      "Pedidos",
      "Total",
    ],
    rows: getOperatorClosings(report).map((closing) => [
      text(closing.operatorName),
      ...PAYMENT_METHOD_VALUES.map((method) =>
        money(closing.payments[method].revenue),
      ),
      count(closing.orderCount),
      money(closing.revenue),
    ]),
  };
}

function buildProductsTable(
  title: string,
  products: readonly ProductSales[],
): ReportTable {
  return {
    title,
    headers: [
      "Produto",
      "Categoria",
      "Quantidade",
      "Pedidos",
      "Faturamento",
      "CMV",
    ],
    rows: products.map((product) => [
      text(product.productName),
      text(product.categoryName ?? "Sem categoria"),
      count(product.quantity),
      count(product.orderCount),
      money(product.revenue),
      percent(getCostShare(product.cost, product.revenue)),
    ]),
  };
}

function buildDaysTable(report: SalesReport): ReportTable {
  return {
    title: "Faturamento por dia",
    headers: ["Data", "Pedidos", "Faturamento"],
    rows: report.byDay.map((day) => [
      text(format(parseISO(day.date), "dd/MM/yyyy")),
      count(day.orderCount),
      money(day.revenue),
    ]),
  };
}

function buildHoursTable(report: SalesReport): ReportTable {
  return {
    title: "Vendas por horário",
    headers: ["Horário", "Pedidos", "Faturamento"],
    rows: getHourlySeries(report).map((entry) => [
      text(formatHourRange(entry.hour)),
      count(entry.orderCount),
      money(entry.revenue),
    ]),
  };
}

function buildWeekdaysTable(report: SalesReport): ReportTable {
  return {
    title: "Vendas por dia da semana",
    headers: ["Dia da semana", "Pedidos", "Faturamento"],
    rows: report.byWeekday.map((entry) => [
      text(formatWeekday(entry.weekday)),
      count(entry.orderCount),
      money(entry.revenue),
    ]),
  };
}

export function buildReportTables(report: SalesReport): ReportTable[] {
  return [
    buildSummaryTable(report),
    buildPaymentsTable(report),
    ...(report.accountReceipts.length > 0 ? [buildReceiptsTable(report)] : []),
    buildOperatorsTable(report),
    buildProductsTable("Produtos mais vendidos", getBestSellers(report)),
    buildProductsTable("Produtos menos vendidos", getWorstSellers(report)),
    buildDaysTable(report),
    buildHoursTable(report),
    ...(hasWeekdayChart(report) ? [buildWeekdaysTable(report)] : []),
  ];
}
