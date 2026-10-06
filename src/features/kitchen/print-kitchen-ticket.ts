import {
  type OrderTicketBusiness,
  printOrderTicket,
} from "@/features/orders/print-order-ticket";
import type { KitchenTicket } from "./types";

const UNNAMED_CUSTOMER_LABEL = "Sem nome";

export function printKitchenTicket(
  ticket: KitchenTicket,
  business: OrderTicketBusiness,
): void {
  const subtotal = ticket.items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  const takeawayFee =
    ticket.isTakeaway && !ticket.isAddition ? ticket.takeawayFee : 0;

  printOrderTicket({
    business,
    customerName: ticket.customerName ?? UNNAMED_CUSTOMER_LABEL,
    items: ticket.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      total: item.unitPrice * item.quantity,
      note: item.note ?? undefined,
      addonNames: item.addonNames,
    })),
    subtotal,
    takeawayFee,
    total: subtotal + takeawayFee,
    note: ticket.note ?? undefined,
    createdAt: new Date(ticket.createdAt),
  });
}
