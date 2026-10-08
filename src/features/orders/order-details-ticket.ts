import { getPaymentMethodLabel } from "./payment-methods";
import type { OrderTicket, OrderTicketBusiness } from "./print-order-ticket";
import type { OrderDetails } from "./types";

const UNNAMED_CUSTOMER_LABEL = "Sem nome";

export function getOrderCustomerLabel(order: OrderDetails): string {
  return order.customerName ?? UNNAMED_CUSTOMER_LABEL;
}

export function getOrderPaymentChange(order: OrderDetails): number {
  return order.payments.reduce(
    (change, payment) =>
      payment.method === "cash" && payment.amountReceived !== null
        ? change + Math.max(payment.amountReceived - payment.amount, 0)
        : change,
    0,
  );
}

export function buildOrderDetailsTicket(
  order: OrderDetails,
  business: OrderTicketBusiness,
): OrderTicket {
  const change = getOrderPaymentChange(order);

  return {
    business,
    customerName: getOrderCustomerLabel(order),
    isTakeaway: order.isTakeaway,
    items: order.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      total: item.total,
      note: item.note ?? undefined,
      addonNames: item.addonNames,
    })),
    subtotal: order.subtotal,
    takeawayFee: order.takeawayFee,
    serviceFee: order.serviceFee,
    discount: order.discount,
    loyaltyReward: order.loyaltyReward,
    total: order.total,
    note: order.note ?? undefined,
    createdAt: new Date(order.paidAt ?? order.createdAt),
    payments: order.payments.map((payment) => ({
      label: getPaymentMethodLabel(payment.method),
      amount: (payment.amountReceived ?? payment.amount) + payment.surcharge,
    })),
    change: change > 0 ? change : undefined,
  };
}
