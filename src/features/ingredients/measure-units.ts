import type { SelectOption } from "@/components/form/select-field";
import type { Ingredient, MeasureUnit } from "./types";

export const MEASURE_UNITS = {
  unit: { label: "Unidade", symbol: "un" },
  g: { label: "Grama", symbol: "g" },
  kg: { label: "Quilograma", symbol: "kg" },
  ml: { label: "Mililitro", symbol: "ml" },
  l: { label: "Litro", symbol: "L" },
} as const satisfies Record<MeasureUnit, { label: string; symbol: string }>;

export const MEASURE_UNIT_VALUES = Object.keys(MEASURE_UNITS) as [
  MeasureUnit,
  ...MeasureUnit[],
];

export const MEASURE_UNIT_OPTIONS: readonly SelectOption[] =
  MEASURE_UNIT_VALUES.map((unit) => ({
    value: unit,
    label: `${MEASURE_UNITS[unit].label} (${MEASURE_UNITS[unit].symbol})`,
  }));

export function getUnitSymbol(unit: MeasureUnit): string {
  return MEASURE_UNITS[unit].symbol;
}

export type StockStatus = "out" | "low" | "ok";

export function getStockStatus(
  ingredient: Pick<Ingredient, "currentStock" | "minimumStock">,
): StockStatus {
  if (ingredient.currentStock <= 0) return "out";
  if (ingredient.currentStock <= ingredient.minimumStock) return "low";
  return "ok";
}
