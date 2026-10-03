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
