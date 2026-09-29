import { format } from "date-fns";
import { formatCurrency } from "@/lib/format";
import { formatCnpj, formatPhone } from "@/lib/masks";

export type OrderTicketItem = {
  name: string;
  quantity: number;
  total: number;
};

export type OrderTicketBusiness = {
  name: string;
  taxId: string | null;
  phone: string | null;
  address: string | null;
};

export type OrderTicketPayment = {
  label: string;
  amount: number;
  change?: number;
};

export type OrderTicket = {
  business: OrderTicketBusiness;
  customerName: string;
  items: readonly OrderTicketItem[];
  subtotal: number;
  takeawayFee: number;
  total: number;
  note?: string;
  createdAt: Date;
  payment?: OrderTicketPayment;
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
  body { font-family: Arial, Helvetica, sans-serif; color: #000; width: 72mm; font-size: 13px; }
  h1 { font-size: 17px; text-align: center; padding-bottom: 10px; }
  .business { text-align: center; font-size: 11px; padding-bottom: 8px; display: flex; flex-direction: column; gap: 2px; }
  .business-name { padding-bottom: 4px; }
  section { border-top: 1px solid #000; padding: 8px 0; display: flex; flex-direction: column; gap: 4px; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .items { gap: 6px; }
  .items .row { font-size: 15px; font-weight: 700; }
  .totals { border-top-style: dashed; }
  .strong { font-weight: 700; }
  .customer { font-size: 15px; font-weight: 700; }
  .note { white-space: pre-wrap; }
`;

function buildRow(label: string, value: string, isStrong = false): string {
  return `<div class="row${isStrong ? " strong" : ""}"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;
}

function buildBusinessHeader(business: OrderTicketBusiness): string {
  const details = [
    business.taxId ? `CNPJ ${formatCnpj(business.taxId)}` : null,
    business.phone ? `Tel. ${formatPhone(business.phone)}` : null,
    business.address,
  ].filter((detail) => detail !== null);

  if (details.length === 0) return `<h1>${escapeHtml(business.name)}</h1>`;

  return `<h1 class="business-name">${escapeHtml(business.name)}</h1><div class="business">${details
    .map((detail) => `<p>${escapeHtml(detail)}</p>`)
    .join("")}</div>`;
}

function buildTicketHtml(ticket: OrderTicket): string {
  const items = ticket.items
    .map((item) =>
      buildRow(`${item.quantity}x ${item.name}`, formatCurrency(item.total)),
    )
    .join("");
  const hasTakeawayFee = ticket.takeawayFee > 0;
  const hasTotalRow = hasTakeawayFee || ticket.payment !== undefined;
  const totals = [
    buildRow("Subtotal", formatCurrency(ticket.subtotal)),
    hasTakeawayFee
      ? buildRow("Para levar", formatCurrency(ticket.takeawayFee))
      : "",
    hasTotalRow ? buildRow("Total", formatCurrency(ticket.total), true) : "",
  ].join("");
  const payment = ticket.payment
    ? `<section>${buildRow(ticket.payment.label, formatCurrency(ticket.payment.amount))}${
        ticket.payment.change
          ? buildRow("Troco", formatCurrency(ticket.payment.change))
          : ""
      }</section>`
    : "";
  const note = ticket.note
    ? `<p class="note"><strong>Obs:</strong> ${escapeHtml(ticket.note)}</p>`
    : "";

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Pedido de ${escapeHtml(ticket.customerName)}</title><style>${TICKET_STYLES}</style></head><body>
    ${buildBusinessHeader(ticket.business)}
    <section>
      <p>Data: ${format(ticket.createdAt, "dd/MM/yyyy, HH:mm")}</p>
      <p>Cliente: <span class="customer">${escapeHtml(ticket.customerName)}</span></p>
      ${note}
    </section>
    <section class="items">${items}</section>
    <section class="totals">${totals}</section>
    ${payment}
  </body></html>`;
}

const PRINT_CLEANUP_DELAY_IN_MS = 1000;

export function printOrderTicket(ticket: OrderTicket): void {
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

export function toOrderTicketBusiness(
  organization: OrderTicketBusiness,
): OrderTicketBusiness {
  return {
    name: organization.name,
    taxId: organization.taxId,
    phone: organization.phone,
    address: organization.address,
  };
}
