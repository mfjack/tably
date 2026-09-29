const LOCALE = "pt-BR";

export const CURRENCY_SYMBOL = "$";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const smallUnitCostFormatter = new Intl.NumberFormat(LOCALE, {
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

function formatWithCurrencySymbol(
  value: number,
  formatter: Intl.NumberFormat,
): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}${CURRENCY_SYMBOL} ${formatter.format(Math.abs(value))}`;
}

export function formatCurrency(value: number): string {
  return formatWithCurrencySymbol(value, currencyFormatter);
}

export function formatUnitCost(value: number): string {
  const isSmallUnitCost = value > 0 && value < SMALL_UNIT_COST_THRESHOLD;
  return formatWithCurrencySymbol(
    value,
    isSmallUnitCost ? smallUnitCostFormatter : currencyFormatter,
  );
}

export function formatQuantity(value: number): string {
  return quantityFormatter.format(value);
}

export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}
