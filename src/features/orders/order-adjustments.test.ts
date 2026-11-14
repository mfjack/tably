import { describe, expect, it } from "vitest";
import { calculateOrderTotals } from "./order-adjustments";

const BASE_INPUT = {
  subtotal: 50,
  takeawayFee: 0,
  isTakeaway: false,
  serviceFeePercent: 10,
};

describe("calculateOrderTotals", () => {
  it("soma a taxa de serviço sobre o subtotal", () => {
    const totals = calculateOrderTotals({
      ...BASE_INPUT,
      adjustments: { hasServiceFee: true },
    });
    expect(totals.serviceFee).toBe(5);
    expect(totals.total).toBe(55);
  });

  it("não cobra taxa de serviço em pedido para levar", () => {
    const totals = calculateOrderTotals({
      ...BASE_INPUT,
      takeawayFee: 2,
      isTakeaway: true,
      adjustments: { hasServiceFee: true },
    });
    expect(totals.serviceFee).toBe(0);
    expect(totals.total).toBe(52);
  });

  it("aplica desconto percentual", () => {
    const totals = calculateOrderTotals({
      ...BASE_INPUT,
      subtotal: 40,
      adjustments: {
        hasServiceFee: false,
        discount: { type: "percent", value: 10 },
      },
    });
    expect(totals.discount).toBe(4);
    expect(totals.total).toBe(36);
  });

  it("ignora desconto maior que o pedido", () => {
    const totals = calculateOrderTotals({
      ...BASE_INPUT,
      subtotal: 40,
      adjustments: {
        hasServiceFee: false,
        discount: { type: "amount", value: 50 },
      },
    });
    expect(totals.isDiscountValid).toBe(false);
    expect(totals.discount).toBe(0);
    expect(totals.total).toBe(40);
  });

  it("ignora desconto de 100%", () => {
    const totals = calculateOrderTotals({
      ...BASE_INPUT,
      adjustments: {
        hasServiceFee: false,
        discount: { type: "percent", value: 100 },
      },
    });
    expect(totals.isDiscountValid).toBe(false);
    expect(totals.total).toBe(50);
  });
});
