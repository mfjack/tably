import type { PaymentMethod } from "@/features/orders/types";
import type {
  CieloOrder,
  CieloOrderStatus,
  CieloPaymentCode,
} from "@/lib/cielo/types";
import {
  CARD_TERMINAL_METHODS,
  type CardTerminalCharge,
  type CardTerminalMethod,
} from "./types";

const PAYMENT_CODE_BY_METHOD = {
  credit_card: "CREDITO_AVISTA",
  debit_card: "DEBITO_AVISTA",
  pix: "PIX",
} as const satisfies Record<CardTerminalMethod, CieloPaymentCode>;

const SETTLED_ORDER_STATUSES: readonly CieloOrderStatus[] = ["PAID", "CLOSED"];

const METHOD_BY_PRODUCT_NAME: Readonly<Record<string, CardTerminalMethod>> = {
  CREDITO: "credit_card",
  DEBITO: "debit_card",
  PIX: "pix",
};

export function isCardTerminalMethod(
  method: PaymentMethod | undefined,
): method is CardTerminalMethod {
  return CARD_TERMINAL_METHODS.some(
    (terminalMethod) => terminalMethod === method,
  );
}

export function toCieloPaymentCode(
  method: CardTerminalMethod,
): CieloPaymentCode {
  return PAYMENT_CODE_BY_METHOD[method];
}

function toMethodFromPaymentCode(
  paymentCode: CieloPaymentCode | undefined,
): CardTerminalMethod {
  if (paymentCode === "DEBITO_AVISTA") return "debit_card";
  if (paymentCode === "PIX") return "pix";
  return "credit_card";
}

export function getCardTerminalCharge(order: CieloOrder): CardTerminalCharge {
  const confirmedTransactions = (order.transactions ?? []).filter(
    (transaction) => transaction.status === "CONFIRMED",
  );
  const paidInCents = confirmedTransactions.reduce(
    (total, transaction) =>
      transaction.transaction_type === "PAYMENT"
        ? total + transaction.amount
        : total - transaction.amount,
    0,
  );
  const isSettled = SETTLED_ORDER_STATUSES.includes(order.status);
  if (paidInCents < order.price && !isSettled) return { status: "pending" };

  const productName = confirmedTransactions
    .findLast((transaction) => transaction.transaction_type === "PAYMENT")
    ?.payment_fields?.primary_product_name?.toUpperCase();
  return {
    status: "paid",
    method:
      (productName ? METHOD_BY_PRODUCT_NAME[productName] : undefined) ??
      toMethodFromPaymentCode(order.payment_code),
  };
}
