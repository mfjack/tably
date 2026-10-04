import {
  Banknote,
  BookUser,
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
  customer_account: { label: "Conta", icon: BookUser },
} as const satisfies Record<PaymentMethod, { label: string; icon: LucideIcon }>;

export const PAYMENT_METHOD_VALUES = Object.keys(PAYMENT_METHODS) as [
  PaymentMethod,
  ...PaymentMethod[],
];

export const RECEIVABLE_PAYMENT_METHOD_VALUES = [
  "credit_card",
  "debit_card",
  "pix",
  "cash",
] as const satisfies readonly PaymentMethod[];

export type ReceivablePaymentMethod =
  (typeof RECEIVABLE_PAYMENT_METHOD_VALUES)[number];

export function isReceivablePaymentMethod(
  method: PaymentMethod,
): method is ReceivablePaymentMethod {
  return RECEIVABLE_PAYMENT_METHOD_VALUES.some(
    (receivableMethod) => receivableMethod === method,
  );
}

export function sortByPaymentMethod<TItem extends { method: PaymentMethod }>(
  items: readonly TItem[],
): TItem[] {
  return [...items].sort(
    (first, second) =>
      PAYMENT_METHOD_VALUES.indexOf(first.method) -
      PAYMENT_METHOD_VALUES.indexOf(second.method),
  );
}

export function sortPaymentMethods(
  methods: readonly PaymentMethod[],
): PaymentMethod[] {
  return PAYMENT_METHOD_VALUES.filter((method) => methods.includes(method));
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS[method].label;
}
