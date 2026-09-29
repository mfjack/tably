import {
  Banknote,
  CreditCard,
  type LucideIcon,
  QrCode,
  Wallet,
} from "lucide-react";
import type { PaymentMethod } from "./types";

export const PAYMENT_METHODS = {
  credit_card: { label: "Crédito", icon: CreditCard },
  debit_card: { label: "Débito", icon: Wallet },
  pix: { label: "Pix", icon: QrCode },
  cash: { label: "Dinheiro", icon: Banknote },
} as const satisfies Record<PaymentMethod, { label: string; icon: LucideIcon }>;

export const PAYMENT_METHOD_VALUES = Object.keys(PAYMENT_METHODS) as [
  PaymentMethod,
  ...PaymentMethod[],
];

export function getPaymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS[method].label;
}
