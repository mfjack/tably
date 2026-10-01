import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/format";
import { formatCnpj, formatPhone } from "@/lib/masks";
import type {
  GroupedOrderTicket,
  OrderTicket,
  OrderTicketBusiness,
  OrderTicketItem,
} from "./print-order-ticket";

const PRICE_COLUMN_WIDTH = 11;
const PAPER_FEED_LINES = 6;

type ReceiptColumns = { width: number; align: "left" | "right" }[];

const CHARACTER_WIDTH_IN_DOTS = 12;
const NARROW_PRINTER_COLUMNS = 32;
const WIDE_PRINTER_COLUMNS = 48;
const SET_LEFT_MARGIN_COMMAND = [0x1d, 0x4c] as const;

function buildLeftMarginCommand(columns: number): number[] {
  const printerColumns =
    columns > NARROW_PRINTER_COLUMNS
      ? WIDE_PRINTER_COLUMNS
      : NARROW_PRINTER_COLUMNS;
  const marginInDots =
    Math.max(Math.floor((printerColumns - columns) / 2), 0) *
    CHARACTER_WIDTH_IN_DOTS;
  return [
    ...SET_LEFT_MARGIN_COMMAND,
    marginInDots % 256,
    Math.floor(marginInDots / 256),
  ];
}

export function startReceipt(columns: number) {
  return new ReceiptPrinterEncoder({ language: "esc-pos", columns })
    .initialize()
    .raw(buildLeftMarginCommand(columns));
}

function buildPriceColumns(totalColumns: number): ReceiptColumns {
  return [
    { width: totalColumns - PRICE_COLUMN_WIDTH, align: "left" },
    { width: PRICE_COLUMN_WIDTH, align: "right" },
  ];
}

export function writeBusinessHeader(
  encoder: ReceiptPrinterEncoder,
  business: OrderTicketBusiness,
) {
  encoder
    .align("center")
    .bold(true)
    .text(business.name)
    .bold(false)
    .newline()
    .align("left");
  if (business.taxId) {
    encoder.text(`CNPJ ${formatCnpj(business.taxId)}`).newline();
  }
  if (business.phone) {
    encoder.text(`Tel. ${formatPhone(business.phone)}`).newline();
  }
  for (const addressLine of business.address?.split("\n") ?? []) {
    encoder.text(addressLine).newline();
  }
  encoder.align("left");
}

function writeItems(
  encoder: ReceiptPrinterEncoder,
  columns: ReceiptColumns,
  items: readonly OrderTicketItem[],
) {
  for (const item of items) {
    encoder
      .size(1, 2)
      .table(columns, [
        [`${item.quantity}x ${item.name}`, formatCurrency(item.total)],
      ])
      .size(1, 1);
    if (item.note) encoder.text(`   > ${item.note}`).newline();
  }
}

function finishReceipt(encoder: ReceiptPrinterEncoder): Uint8Array {
  return encoder.newline(PAPER_FEED_LINES).cut().encode();
}

export function encodeOrderTicket(
  ticket: OrderTicket,
  totalColumns: number,
): Uint8Array {
  const encoder = startReceipt(totalColumns);
  const columns = buildPriceColumns(encoder.columns);

  writeBusinessHeader(encoder, ticket.business);
  encoder
    .rule()
    .text(`Data: ${format(ticket.createdAt, "dd/MM/yyyy, HH:mm")}`)
    .newline()
    .text("Cliente: ")
    .bold(true)
    .text(ticket.customerName.toUpperCase())
    .bold(false)
    .newline();
  if (ticket.note) {
    encoder.text("Obs: ").bold(true).text(ticket.note).bold(false).newline();
  }
  encoder.rule();

  writeItems(encoder, columns, ticket.items);

  encoder
    .rule()
    .table(columns, [["Subtotal", formatCurrency(ticket.subtotal)]]);
  if (ticket.takeawayFee > 0) {
    encoder.table(columns, [
      ["Para levar", formatCurrency(ticket.takeawayFee)],
    ]);
  }
  if ((ticket.serviceFee ?? 0) > 0) {
    encoder.table(columns, [
      ["Taxa de servico", formatCurrency(ticket.serviceFee ?? 0)],
    ]);
  }
  if ((ticket.discount ?? 0) > 0) {
    encoder.table(columns, [
      ["Desconto", `- ${formatCurrency(ticket.discount ?? 0)}`],
    ]);
  }
  encoder
    .bold(true)
    .table(columns, [["Total", formatCurrency(ticket.total)]])
    .bold(false);

  if (ticket.payments && ticket.payments.length > 0) {
    encoder.rule();
    for (const payment of ticket.payments) {
      encoder.table(columns, [[payment.label, formatCurrency(payment.amount)]]);
    }
    if (ticket.change) {
      encoder.table(columns, [["Troco", formatCurrency(ticket.change)]]);
    }
  }

  return finishReceipt(encoder);
}

export function encodeGroupedOrderTicket(
  ticket: GroupedOrderTicket,
  totalColumns: number,
): Uint8Array {
  const encoder = startReceipt(totalColumns);
  const columns = buildPriceColumns(encoder.columns);
  const entryCount = ticket.entries.length;
  const grandTotal = ticket.entries.reduce(
    (total, entry) => total + entry.total,
    0,
  );

  writeBusinessHeader(encoder, ticket.business);
  encoder
    .rule()
    .text(`Data: ${format(ticket.createdAt, "dd/MM/yyyy, HH:mm")}`)
    .newline()
    .text(`${entryCount} pedidos separados por nome`)
    .newline();

  ticket.entries.forEach((entry, index) => {
    encoder
      .rule({ style: "double" })
      .size(2, 2)
      .bold(true)
      .text(entry.customerName.toUpperCase())
      .bold(false)
      .size(1, 1)
      .text(`  ${index + 1}/${entryCount}`)
      .newline()
      .rule();
    writeItems(encoder, columns, entry.items);
    encoder
      .rule()
      .table(columns, [
        [`Subtotal de ${entry.customerName}`, formatCurrency(entry.total)],
      ]);
  });

  encoder
    .rule({ style: "double" })
    .bold(true)
    .table(columns, [["Total geral", formatCurrency(grandTotal)]])
    .bold(false);

  return finishReceipt(encoder);
}
