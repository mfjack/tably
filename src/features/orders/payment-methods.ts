import {
  Banknote,
  CreditCard,
  type LucideIcon,
  QrCode,
  Wallet,
} from "lucide-react";
import type { PaymentMethod } from "./types";

export const PAYMENT_METHODS = {
  cash: { label: "Dinheiro", icon: Banknote },
  pix: { label: "Pix", icon: QrCode },
  credit_card: { label: "Crédito", icon: CreditCard },
  debit_card: { label: "Débito", icon: Wallet },
} as const satisfies Record<PaymentMethod, { label: string; icon: LucideIcon }>;

export const PAYMENT_METHOD_VALUES = Object.keys(PAYMENT_METHODS) as [
  PaymentMethod,
  ...PaymentMethod[],
];
