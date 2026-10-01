import { format } from "date-fns";
import { getPaymentMethodLabel } from "@/features/orders/payment-methods";
import {
  buildBusinessHeader,
  buildRow,
  type OrderTicketBusiness,
  TICKET_STYLES,
} from "@/features/orders/print-order-ticket";
import {
  buildPriceColumns,
  finishReceipt,
  startReceipt,
  writeBusinessHeader,
} from "@/features/orders/thermal-order-ticket";
import { formatCurrency } from "@/lib/format";
import { escapeHtml } from "@/lib/print-html";
import { printReceipt } from "@/lib/print-receipt";
import type { CashSessionSummary } from "./types";

const DATE_TIME_FORMAT = "dd/MM/yyyy, HH:mm";

type ClosingRow = [label: string, value: string];

function formatDateTime(value: string | null) {
  return value ? format(new Date(value), DATE_TIME_FORMAT) : "-";
}

function getDifference(summary: CashSessionSummary) {
  return (summary.countedCash ?? 0) - summary.expectedCash;
}

function getDifferenceLabel(difference: number) {
  if (difference > 0) return "Sobra";
  if (difference < 0) return "Falta";
  return "Diferença";
}

function buildSections(summary: CashSessionSummary): ClosingRow[][] {
  const difference = getDifference(summary);

  return [
    [
      ["Abertura", formatDateTime(summary.openedAt)],
      ["Fechamento", formatDateTime(summary.closedAt)],
      ["Aberto por", summary.openedByName ?? "-"],
      ["Fechado por", summary.closedByName ?? "-"],
    ],
    [
      ["Vendas", String(summary.orderCount)],
      ...summary.payments.map(
        (payment): ClosingRow => [
          getPaymentMethodLabel(payment.method),
          formatCurrency(payment.amount),
        ],
      ),
      ["Total recebido", formatCurrency(summary.receivedTotal)],
    ],
    [
      ["Troco inicial", formatCurrency(summary.openingAmount)],
      ["Reforços", formatCurrency(summary.supplies)],
      ["Sangrias", `- ${formatCurrency(summary.withdrawals)}`],
      ["Dinheiro esperado", formatCurrency(summary.expectedCash)],
      ["Dinheiro contado", formatCurrency(summary.countedCash ?? 0)],
      [getDifferenceLabel(difference), formatCurrency(Math.abs(difference))],
    ],
  ];
}

function encodeCashClosing(
  summary: CashSessionSummary,
  business: OrderTicketBusiness,
  totalColumns: number,
): Uint8Array {
  const encoder = startReceipt(totalColumns);
  const columns = buildPriceColumns(encoder.columns);

  writeBusinessHeader(encoder, business);
  encoder.rule().bold(true).text("FECHAMENTO DE CAIXA").bold(false).newline();

  for (const rows of buildSections(summary)) {
    encoder.rule().table(columns, rows);
  }
  if (summary.closingNote) {
    encoder.rule().text(`Obs: ${summary.closingNote}`).newline();
  }

  return finishReceipt(encoder);
}

export function printCashClosing(
  summary: CashSessionSummary,
  business: OrderTicketBusiness,
): void {
  const sections = buildSections(summary)
    .map(
      (rows) =>
        `<section>${rows.map(([label, value]) => buildRow(label, value)).join("")}</section>`,
    )
    .join("");
  const note = summary.closingNote
    ? `<section><p class="note"><strong>Obs:</strong> ${escapeHtml(summary.closingNote)}</p></section>`
    : "";

  printReceipt({
    encode: (columns) => encodeCashClosing(summary, business, columns),
    html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Fechamento de caixa</title><style>${TICKET_STYLES}</style></head><body>
    ${buildBusinessHeader(business)}
    <section><p class="strong">Fechamento de caixa</p></section>
    ${sections}
    ${note}
  </body></html>`,
  });
}
