import { describe, expect, it } from "vitest";
import { roundCurrency, toCents } from "./money";

describe("toCents", () => {
  it("converte reais em centavos inteiros", () => {
    expect(toCents(18)).toBe(1800);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });
});

describe("roundCurrency", () => {
  it("arredonda para duas casas", () => {
    expect(roundCurrency(1.236)).toBe(1.24);
    expect(roundCurrency(1.234)).toBe(1.23);
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });
});
