import { format } from "date-fns";
import { TICKET_STYLES } from "@/features/orders/print-order-ticket";
import { escapeHtml, printHtml } from "@/lib/print-html";
import type { KitchenTicket } from "./types";

const UNNAMED_CUSTOMER_LABEL = "Sem nome";

function buildTags(ticket: KitchenTicket): string {
  const tags = [
    ticket.isAddition ? "ADICIONAL" : null,
    ticket.isTakeaway ? "PARA LEVAR" : null,
  ].filter((tag) => tag !== null);

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

  printHtml(`<!doctype html>
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
</html>`);
}
