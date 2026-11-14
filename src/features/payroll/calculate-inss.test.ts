import { describe, expect, it } from "vitest";
import { calculateInss } from "./calculate-payslip";

const BRACKETS = [
  { upTo: 1518, rate: 0.075 },
  { upTo: 2793.88, rate: 0.09 },
  { upTo: 4190.83, rate: 0.12 },
  { upTo: 8157.41, rate: 0.14 },
];

describe("calculateInss", () => {
  it("calcula de forma progressiva por faixa", () => {
    expect(calculateInss(3000, BRACKETS)).toBe(253.41);
  });

  it("para de descontar acima do teto", () => {
    expect(calculateInss(10000, BRACKETS)).toBe(951.63);
  });

  it("não desconta de salário zero", () => {
    expect(calculateInss(0, BRACKETS)).toBe(0);
  });
});
