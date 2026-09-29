const LOCALE = "pt-BR";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "BRL",
});

const smallUnitCostFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const SMALL_UNIT_COST_THRESHOLD = 0.1;

const quantityFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 3,
});

const percentFormatter = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatUnitCost(value: number): string {
  const isSmallUnitCost = value > 0 && value < SMALL_UNIT_COST_THRESHOLD;
  return isSmallUnitCost
    ? smallUnitCostFormatter.format(value)
    : currencyFormatter.format(value);
}

export function formatQuantity(value: number): string {
  return quantityFormatter.format(value);
}

export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}
