const CENTS_PER_UNIT = 100;

export function toCents(value: number): number {
  return Math.round(value * CENTS_PER_UNIT);
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * CENTS_PER_UNIT) / CENTS_PER_UNIT;
}
