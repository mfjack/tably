import { formatCurrency } from "@/lib/format";
import { getPaymentMethodLabel } from "./payment-methods";
import type { OrderPaymentInput } from "./schemas";
import type { OrderPayment } from "./types";

export function toOrderPaymentsPayload(payments: readonly OrderPaymentInput[]) {
  return payments.map((payment) => ({
    method: payment.method,
    amount: payments.length > 1 ? payment.amount : undefined,
    amount_received:
      payment.method === "cash" ? payment.amountReceived : undefined,
    customer_account_id:
      payment.method === "customer_account"
        ? payment.customerAccountId
        : undefined,
  }));
}

export function getPaymentsChange(
  payments: readonly OrderPaymentInput[],
  orderTotal: number,
): number {
  if (payments.length === 1) {
    const [payment] = payments;
    if (payment?.method !== "cash" || payment.amountReceived === undefined) {
      return 0;
    }
    return Math.max(payment.amountReceived - orderTotal, 0);
  }

  return payments.reduce((change, payment) => {
    if (payment.method !== "cash" || payment.amountReceived === undefined) {
      return change;
    }
    return change + Math.max(payment.amountReceived - (payment.amount ?? 0), 0);
  }, 0);
}

export function getChangeMessage(
  payments: readonly OrderPaymentInput[] | undefined,
  orderTotal: number,
): string | undefined {
  const change = payments ? getPaymentsChange(payments, orderTotal) : 0;
  return change > 0 ? `Troco: ${formatCurrency(change)}` : undefined;
}

export function isCustomerAccountOnly(payments: readonly OrderPaymentInput[]) {
  return payments.length === 1 && payments[0]?.method === "customer_account";
}

export function formatOrderPaymentMethods(
  payments: readonly OrderPayment[],
): string {
  if (payments.length === 0) return "—";
  return payments
    .map((payment) => getPaymentMethodLabel(payment.method))
    .join(" + ");
}
