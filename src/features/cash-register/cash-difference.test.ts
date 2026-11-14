import { describe, expect, it } from "vitest";
import { getCashDifference } from "./cash-difference";

describe("getCashDifference", () => {
  it("bate quando contado e esperado são iguais", () => {
    expect(getCashDifference({ countedCash: 100, expectedCash: 100 })).toEqual({
      status: "balanced",
      label: "Bateu",
      amount: 0,
    });
  });

  it("mostra sobra sem erro de centavos", () => {
    expect(
      getCashDifference({ countedCash: 100.3, expectedCash: 100.1 }),
    ).toEqual({ status: "over", label: "Sobra", amount: 0.2 });
  });

  it("mostra falta", () => {
    expect(getCashDifference({ countedCash: 90, expectedCash: 100 })).toEqual({
      status: "short",
      label: "Falta",
      amount: 10,
    });
  });

  it("não calcula antes de contar o caixa", () => {
    expect(getCashDifference({ countedCash: null, expectedCash: 100 })).toBe(
      null,
    );
  });
});
