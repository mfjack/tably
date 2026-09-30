import {
  buildBusinessHeader,
  buildRow,
  type OrderTicketBusiness,
  TICKET_STYLES,
} from "@/features/orders/print-order-ticket";
import { formatDateKey } from "@/lib/format";
import { formatCpf, formatPis } from "@/lib/masks";
import { escapeHtml, printHtml } from "@/lib/print-html";
import { getZonedParts } from "./time-utils";
import type { PunchReceipt } from "./types";

const PUNCH_LABELS = [
  "Entrada",
  "Saída para intervalo",
  "Volta do intervalo",
  "Saída",
] as const;

export function getPunchLabel(punchIndex: number): string {
  return PUNCH_LABELS[punchIndex] ?? `Marcação ${punchIndex + 1}`;
}

export function printPunchReceipt(
  receipt: PunchReceipt,
  business: OrderTicketBusiness,
  timeZone: string,
): void {
  const zoned = getZonedParts(receipt.punchedAt, timeZone);
  const rows = [
    buildRow("Funcionário", receipt.employeeName, true),
    buildRow("CPF", formatCpf(receipt.employeeCpf)),
    receipt.employeePis ? buildRow("PIS", formatPis(receipt.employeePis)) : "",
  ].join("");
  const punchRows = [
    buildRow("Data", formatDateKey(zoned.date), true),
    buildRow("Horário", `${zoned.time}:${zoned.seconds}`, true),
    buildRow("Tipo", getPunchLabel(receipt.dayPunches.length - 1)),
    buildRow("NSR", receipt.nsr.toString().padStart(9, "0")),
  ].join("");

  printHtml(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Comprovante de ponto</title>
<style>${TICKET_STYLES}
  .hash { font-family: monospace; font-size: 10px; word-break: break-all; }
</style>
</head>
<body>
${buildBusinessHeader(business)}
<section><p class="strong">Comprovante de registro de ponto</p></section>
<section>${rows}</section>
<section>${punchRows}</section>
<section><p>Código de verificação</p><p class="hash">${escapeHtml(receipt.hash)}</p></section>
</body>
</html>`);
}
