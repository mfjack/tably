import { format } from "date-fns";
import { formatCurrency } from "@/lib/format";
import { formatCnpj, formatPhone } from "@/lib/masks";
import { escapeHtml, printHtml } from "@/lib/print-html";

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

export const TICKET_STYLES = `
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

export function buildRow(
  label: string,
  value: string,
  isStrong = false,
): string {
  return `<div class="row${isStrong ? " strong" : ""}"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;
}

export function buildBusinessHeader(business: OrderTicketBusiness): string {
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

export function printOrderTicket(ticket: OrderTicket): void {
  printHtml(buildTicketHtml(ticket));
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
