import { describe, expect, it } from "vitest";
import {
  countUnassignedUnits,
  distributeAdjustment,
  splitAmountEqually,
  sumAmountsByPerson,
} from "./split-bill";

describe("splitAmountEqually", () => {
  it("divide sem perder centavos", () => {
    const parts = splitAmountEqually(10, 3);
    expect(parts).toEqual([3.34, 3.33, 3.33]);
    expect(parts.reduce((total, part) => total + part, 0)).toBeCloseTo(10);
  });

  it("não divide por zero pessoas", () => {
    expect(splitAmountEqually(5, 0)).toEqual([]);
  });
});

describe("sumAmountsByPerson", () => {
  it("soma os itens de cada pessoa e divide a taxa de viagem", () => {
    const units = [
      { key: "a", productName: "Café", amount: 10 },
      { key: "b", productName: "Bolo", amount: 5 },
    ];
    expect(sumAmountsByPerson(units, { a: 0, b: 1 }, 2, 3)).toEqual([
      11.5, 6.5,
    ]);
  });
});

describe("distributeAdjustment", () => {
  it("distribui a taxa na proporção do que cada um consumiu", () => {
    expect(distributeAdjustment([30, 70], 100, 10)).toEqual([33, 77]);
  });

  it("distribui o desconto subtraindo", () => {
    expect(distributeAdjustment([50, 50], 100, -10)).toEqual([45, 45]);
  });

  it("não perde o centavo que sobra na divisão", () => {
    expect(distributeAdjustment([1, 1, 1], 3, 1)).toEqual([1.34, 1.33, 1.33]);
  });
});

describe("countUnassignedUnits", () => {
  it("conta itens sem pessoa ou com pessoa removida", () => {
    const units = [
      { key: "a", productName: "Café", amount: 10 },
      { key: "b", productName: "Bolo", amount: 5 },
      { key: "c", productName: "Suco", amount: 8 },
    ];
    expect(countUnassignedUnits(units, { a: 0, b: 3 }, 2)).toBe(2);
  });
});
