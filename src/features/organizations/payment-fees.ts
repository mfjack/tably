import type { PaymentMethod } from "@/features/orders/types";
import type { OrganizationPaymentFees } from "./types";

export function getPaymentMethodFeePercent(
  paymentFees: OrganizationPaymentFees,
  method: PaymentMethod,
): number {
  if (method === "credit_card") return paymentFees.creditCardFeePercent;
  if (method === "debit_card") return paymentFees.debitCardFeePercent;
  if (method === "pix") return paymentFees.pixFeePercent;
  return 0;
}

export function getPaymentSurcharge(
  paymentFees: OrganizationPaymentFees,
  method: PaymentMethod,
  amount: number,
): number {
  if (!paymentFees.isPassedOnToCustomer) return 0;
  const feePercent = getPaymentMethodFeePercent(paymentFees, method);
  if (feePercent <= 0 || feePercent >= 100) return 0;
  return Math.round((amount / (1 - feePercent / 100) - amount) * 100) / 100;
}
