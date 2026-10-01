import { CURRENCY_SYMBOL } from "@/lib/format";

const wholeNumberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMenuPrice(price: number): string {
  const formatter = Number.isInteger(price)
    ? wholeNumberFormatter
    : decimalFormatter;
  return `${CURRENCY_SYMBOL}${formatter.format(price)}`;
}
