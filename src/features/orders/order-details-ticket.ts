import { getPaymentMethodLabel } from "./payment-methods";
import type { OrderTicket } from "./print-order-ticket";
import type { OrderDetails } from "./types";

const UNNAMED_CUSTOMER_LABEL = "Sem nome";

export function getOrderCustomerLabel(order: OrderDetails): string {
  return order.customerName ?? UNNAMED_CUSTOMER_LABEL;
}

export function getOrderPaymentChange(order: OrderDetails): number {
  if (order.paymentMethod !== "cash" || order.amountReceived === null) return 0;
  return Math.max(order.amountReceived - order.total, 0);
}

export function buildOrderDetailsTicket(
  order: OrderDetails,
  organizationName: string,
): OrderTicket {
  const change = getOrderPaymentChange(order);

  return {
    organizationName,
    customerName: getOrderCustomerLabel(order),
    items: order.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      total: item.total,
    })),
    subtotal: order.subtotal,
    takeawayFee: order.takeawayFee,
    total: order.total,
    note: order.note ?? undefined,
    createdAt: new Date(order.paidAt ?? order.createdAt),
    payment: order.paymentMethod
      ? {
          label: getPaymentMethodLabel(order.paymentMethod),
          amount: order.amountReceived ?? order.total,
          change: change > 0 ? change : undefined,
        }
      : undefined,
  };
}
