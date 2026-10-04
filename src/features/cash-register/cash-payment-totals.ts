import type { CashPaymentTotal } from "./types";

export function getNetPaymentAmount(payment: CashPaymentTotal): number {
  return payment.amount + payment.surcharge - payment.fee;
}

export function sumPayments(
  payments: readonly CashPaymentTotal[],
  field: "amount" | "surcharge" | "fee",
): number {
  return payments.reduce((total, payment) => total + payment[field], 0);
}
