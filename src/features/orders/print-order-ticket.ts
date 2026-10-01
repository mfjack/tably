import { format } from "date-fns";
import { formatCurrency } from "@/lib/format";
import { formatCnpj, formatPhone } from "@/lib/masks";
import { escapeHtml, printHtml } from "@/lib/print-html";

export type OrderTicketItem = {
  name: string;
  quantity: number;
  total: number;
  note?: string;
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
  payments?: readonly OrderTicketPayment[];
  change?: number;
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
  .item-note { font-size: 13px; padding-left: 12px; white-space: pre-wrap; }
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

function buildItemsHtml(items: readonly OrderTicketItem[]): string {
  return items
    .map(
      (item) =>
        buildRow(`${item.quantity}x ${item.name}`, formatCurrency(item.total)) +
        (item.note
          ? `<p class="item-note">↳ ${escapeHtml(item.note)}</p>`
          : ""),
    )
    .join("");
}

function buildTicketHtml(ticket: OrderTicket): string {
  const items = buildItemsHtml(ticket.items);
  const hasTakeawayFee = ticket.takeawayFee > 0;
  const hasPayments = (ticket.payments?.length ?? 0) > 0;
  const hasTotalRow = hasTakeawayFee || hasPayments;
  const totals = [
    buildRow("Subtotal", formatCurrency(ticket.subtotal)),
    hasTakeawayFee
      ? buildRow("Para levar", formatCurrency(ticket.takeawayFee))
      : "",
    hasTotalRow ? buildRow("Total", formatCurrency(ticket.total), true) : "",
  ].join("");
  const payment = hasPayments
    ? `<section>${(ticket.payments ?? [])
        .map((ticketPayment) =>
          buildRow(ticketPayment.label, formatCurrency(ticketPayment.amount)),
        )
        .join("")}${
        ticket.change ? buildRow("Troco", formatCurrency(ticket.change)) : ""
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

export type GroupedOrderTicketEntry = {
  customerName: string;
  items: readonly OrderTicketItem[];
  total: number;
};

export type GroupedOrderTicket = {
  business: OrderTicketBusiness;
  entries: readonly GroupedOrderTicketEntry[];
  createdAt: Date;
};

const GROUPED_TICKET_STYLES = `
  .person { border-top: 3px solid #000; padding-top: 10px; gap: 6px; }
  .person-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; border-bottom: 1px solid #000; padding-bottom: 6px; }
  .person-name { font-size: 20px; font-weight: 700; }
  .person-position { font-size: 12px; }
  .person .row { font-size: 15px; font-weight: 700; }
  .person-subtotal { border-top: 1px dashed #000; padding-top: 6px; }
  .person-subtotal .row { font-size: 13px; font-weight: 400; }
  .cut { text-align: center; font-size: 11px; letter-spacing: 2px; padding: 6px 0; }
  .grand-total { border-top: 3px double #000; }
`;

export function buildGroupedOrderTicketHtml(
  ticket: GroupedOrderTicket,
): string {
  const grandTotal = ticket.entries.reduce(
    (total, entry) => total + entry.total,
    0,
  );
  const entryCount = ticket.entries.length;
  const entries = ticket.entries
    .map(
      (entry, index) => `<section class="person">
      <div class="person-header">
        <span class="person-name">${escapeHtml(entry.customerName)}</span>
        <span class="person-position">${index + 1}/${entryCount}</span>
      </div>
      ${buildItemsHtml(entry.items)}
      <div class="person-subtotal">${buildRow(`Subtotal de ${entry.customerName}`, formatCurrency(entry.total))}</div>
    </section>`,
    )
    .join(`<p class="cut">- - - - - - - - - - - - - - - -</p>`);

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Pedidos</title><style>${TICKET_STYLES}${GROUPED_TICKET_STYLES}</style></head><body>
    ${buildBusinessHeader(ticket.business)}
    <section>
      <p>Data: ${format(ticket.createdAt, "dd/MM/yyyy, HH:mm")}</p>
      <p>${entryCount} pedidos separados por nome</p>
    </section>
    ${entries}
    <section class="grand-total">${buildRow("Total geral", formatCurrency(grandTotal), true)}</section>
  </body></html>`;
}

export function printGroupedOrderTicket(ticket: GroupedOrderTicket): void {
  printHtml(buildGroupedOrderTicketHtml(ticket));
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
