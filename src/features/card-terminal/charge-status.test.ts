import { describe, expect, it } from "vitest";
import type { CieloOrder, CieloTransaction } from "@/lib/cielo/types";
import { getCardTerminalCharge } from "./charge-status";

function buildTransaction(
  overrides: Partial<CieloTransaction>,
): CieloTransaction {
  return {
    id: "transaction",
    status: "CONFIRMED",
    amount: 2350,
    transaction_type: "PAYMENT",
    payment_fields: { primary_product_name: "DEBITO" },
    ...overrides,
  };
}

function buildOrder(transactions: CieloTransaction[]): CieloOrder {
  return {
    id: "order",
    status: "ENTERED",
    price: 2350,
    payment_code: "CREDITO_AVISTA",
    transactions,
  };
}

describe("getCardTerminalCharge", () => {
  it("stays pending without confirmed payments", () => {
    expect(getCardTerminalCharge(buildOrder([]))).toEqual({
      status: "pending",
    });
    expect(
      getCardTerminalCharge(
        buildOrder([buildTransaction({ status: "PENDING" })]),
      ),
    ).toEqual({ status: "pending" });
  });

  it("uses the card product the customer actually paid with", () => {
    expect(getCardTerminalCharge(buildOrder([buildTransaction({})]))).toEqual({
      status: "paid",
      method: "debit_card",
    });
  });

  it("falls back to the requested payment code", () => {
    expect(
      getCardTerminalCharge(
        buildOrder([buildTransaction({ payment_fields: undefined })]),
      ),
    ).toEqual({ status: "paid", method: "credit_card" });
  });

  it("treats an order marked as paid as settled", () => {
    expect(
      getCardTerminalCharge({ ...buildOrder([]), status: "PAID" }),
    ).toEqual({ status: "paid", method: "credit_card" });
  });

  it("treats an unpaid closed order as canceled", () => {
    expect(
      getCardTerminalCharge({ ...buildOrder([]), status: "CLOSED" }),
    ).toEqual({ status: "canceled" });
  });

  it("keeps a closed order paid when the payment was confirmed", () => {
    expect(
      getCardTerminalCharge({
        ...buildOrder([buildTransaction({})]),
        status: "CLOSED",
      }),
    ).toEqual({ status: "paid", method: "debit_card" });
  });

  it("ignores payments that were cancelled afterwards", () => {
    expect(
      getCardTerminalCharge(
        buildOrder([
          buildTransaction({}),
          buildTransaction({ transaction_type: "CANCELLATION" }),
        ]),
      ),
    ).toEqual({ status: "pending" });
  });
});
