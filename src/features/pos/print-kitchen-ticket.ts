import { format } from "date-fns";

export type KitchenTicket = {
  organizationName: string;
  orderNumber: number;
  items: ReadonlyArray<{ name: string; quantity: number }>;
  note?: string;
  createdAt: Date;
};

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

const TICKET_STYLES = `
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ui-monospace, "Courier New", monospace; color: #000; width: 72mm; }
  header { text-align: center; padding-bottom: 8px; border-bottom: 1px dashed #000; }
  h1 { font-size: 22px; }
  .meta { font-size: 12px; margin-top: 2px; }
  ul { list-style: none; padding: 8px 0; border-bottom: 1px dashed #000; }
  li { display: flex; gap: 8px; font-size: 16px; font-weight: 700; padding: 3px 0; }
  .note { font-size: 14px; padding-top: 8px; white-space: pre-wrap; }
`;

function buildTicketHtml(ticket: KitchenTicket): string {
  const items = ticket.items
    .map(
      (item) =>
        `<li><span>${item.quantity}x</span><span>${escapeHtml(item.name)}</span></li>`,
    )
    .join("");
  const note = ticket.note
    ? `<p class="note"><strong>Obs.:</strong> ${escapeHtml(ticket.note)}</p>`
    : "";

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Pedido #${ticket.orderNumber}</title><style>${TICKET_STYLES}</style></head><body><header><h1>Pedido #${ticket.orderNumber}</h1><p class="meta">${escapeHtml(ticket.organizationName)} · ${format(ticket.createdAt, "dd/MM HH:mm")}</p></header><ul>${items}</ul>${note}</body></html>`;
}

const PRINT_CLEANUP_DELAY_IN_MS = 1000;

export function printKitchenTicket(ticket: KitchenTicket): void {
  const printFrame = document.createElement("iframe");
  printFrame.setAttribute("aria-hidden", "true");
  printFrame.style.position = "fixed";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  document.body.appendChild(printFrame);

  const frameWindow = printFrame.contentWindow;
  if (!frameWindow) {
    printFrame.remove();
    return;
  }

  frameWindow.document.open();
  frameWindow.document.write(buildTicketHtml(ticket));
  frameWindow.document.close();
  frameWindow.focus();
  frameWindow.print();

  setTimeout(() => printFrame.remove(), PRINT_CLEANUP_DELAY_IN_MS);
}
