import { describe, expect, it } from "vitest";
import { getPaymentSurcharge } from "./payment-fees";
import type { OrganizationPaymentFees } from "./types";

const FEES: OrganizationPaymentFees = {
  creditCardFeePercent: 5,
  debitCardFeePercent: 2,
  pixFeePercent: 0,
  isPassedOnToCustomer: true,
  creditCardSettlementDays: 1,
  debitCardSettlementDays: 1,
};

describe("getPaymentSurcharge", () => {
  it("repassa a taxa para o lojista receber o valor cheio", () => {
    expect(getPaymentSurcharge(FEES, "credit_card", 95)).toBe(5);
  });

  it("não repassa quando a opção está desligada", () => {
    expect(
      getPaymentSurcharge(
        { ...FEES, isPassedOnToCustomer: false },
        "credit_card",
        95,
      ),
    ).toBe(0);
  });

  it("não cobra acréscimo em Pix sem taxa nem em dinheiro", () => {
    expect(getPaymentSurcharge(FEES, "pix", 95)).toBe(0);
    expect(getPaymentSurcharge(FEES, "cash", 95)).toBe(0);
  });
});
