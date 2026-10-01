import { format } from "date-fns";
import { TICKET_STYLES } from "@/features/orders/print-order-ticket";
import { startReceipt } from "@/features/orders/thermal-order-ticket";
import { escapeHtml } from "@/lib/print-html";
import { printReceipt } from "@/lib/print-receipt";
import type { KitchenTicket } from "./types";

const UNNAMED_CUSTOMER_LABEL = "Sem nome";

const PAPER_FEED_LINES = 6;

function getTags(ticket: KitchenTicket): string[] {
  return [
    ticket.isAddition ? "ADICIONAL" : null,
    ticket.isTakeaway ? "PARA LEVAR" : null,
  ].filter((tag) => tag !== null);
}

function encodeKitchenTicket(
  ticket: KitchenTicket,
  totalColumns: number,
): Uint8Array {
  const encoder = startReceipt(totalColumns);
  const tags = getTags(ticket);

  encoder
    .size(2, 2)
    .bold(true)
    .text((ticket.customerName ?? UNNAMED_CUSTOMER_LABEL).toUpperCase())
    .bold(false)
    .size(1, 1)
    .newline()
    .text(format(new Date(ticket.createdAt), "dd/MM/yyyy, HH:mm"))
    .newline();
  if (tags.length > 0) {
    encoder.bold(true).text(tags.join(" - ")).bold(false).newline();
  }
  encoder.rule();

  for (const item of ticket.items) {
    encoder
      .size(1, 2)
      .bold(true)
      .text(`${item.quantity}x ${item.productName}`)
      .bold(false)
      .size(1, 1)
      .newline();
    if (item.note) encoder.text(`   > ${item.note}`).newline();
  }

  if (ticket.note) {
    encoder
      .rule()
      .text("Obs: ")
      .bold(true)
      .text(ticket.note)
      .bold(false)
      .newline();
  }

  return encoder.newline(PAPER_FEED_LINES).cut().encode();
}

function buildTags(ticket: KitchenTicket): string {
  const tags = getTags(ticket);

  return tags.length > 0
    ? `<p class="strong">${tags.map(escapeHtml).join(" · ")}</p>`
    : "";
}

export function printKitchenTicket(ticket: KitchenTicket): void {
  const customerName = ticket.customerName ?? UNNAMED_CUSTOMER_LABEL;
  const items = ticket.items
    .map(
      (item) =>
        `<p class="kitchen-item">${item.quantity}x ${escapeHtml(item.productName)}</p>${
          item.note ? `<p class="item-note">↳ ${escapeHtml(item.note)}</p>` : ""
        }`,
    )
    .join("");
  const note = ticket.note
    ? `<section><p class="note"><strong>Obs:</strong> ${escapeHtml(ticket.note)}</p></section>`
    : "";

  printReceipt({
    encode: (columns) => encodeKitchenTicket(ticket, columns),
    html: `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Cozinha · ${escapeHtml(customerName)}</title>
<style>${TICKET_STYLES}
  .kitchen-customer { font-size: 20px; font-weight: 700; }
  .kitchen-item { font-size: 16px; font-weight: 700; }
</style>
</head>
<body>
<section>
  <p class="kitchen-customer">${escapeHtml(customerName)}</p>
  <p>${format(new Date(ticket.createdAt), "dd/MM/yyyy, HH:mm")}</p>
  ${buildTags(ticket)}
</section>
<section class="items">${items}</section>
${note}
</body>
</html>`,
  });
}
