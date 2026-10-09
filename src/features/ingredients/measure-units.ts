import type { SelectOption } from "@/components/form/select-field";
import type { Ingredient, MeasureUnit } from "./types";

export const MEASURE_UNITS = {
  unit: { label: "Unidade", symbol: "un" },
  g: { label: "Grama", symbol: "g" },
  kg: { label: "Quilograma", symbol: "kg" },
  ml: { label: "Mililitro", symbol: "ml" },
  l: { label: "Litro", symbol: "L" },
} as const satisfies Record<MeasureUnit, { label: string; symbol: string }>;

export const MEASURE_UNIT_VALUES = [
  "unit",
  "g",
  "ml",
] as const satisfies readonly MeasureUnit[];

export type SelectableMeasureUnit = (typeof MEASURE_UNIT_VALUES)[number];

export function toSelectableMeasureUnit(
  unit: MeasureUnit,
): SelectableMeasureUnit | undefined {
  return MEASURE_UNIT_VALUES.find((selectableUnit) => selectableUnit === unit);
}

function toMeasureUnitOption(unit: SelectableMeasureUnit): SelectOption {
  return {
    value: unit,
    label: `${MEASURE_UNITS[unit].label} (${MEASURE_UNITS[unit].symbol})`,
  };
}

export const MEASURE_UNIT_OPTIONS: readonly SelectOption[] =
  MEASURE_UNIT_VALUES.map(toMeasureUnitOption);

const INTERCHANGEABLE_MEASURE_UNITS = [
  "g",
  "ml",
] as const satisfies readonly SelectableMeasureUnit[];

function isInterchangeableMeasureUnit(unit: MeasureUnit) {
  return INTERCHANGEABLE_MEASURE_UNITS.some(
    (interchangeableUnit) => interchangeableUnit === unit,
  );
}

export function canChangeMeasureUnit(
  currentUnit: MeasureUnit,
  nextUnit: MeasureUnit,
) {
  return (
    currentUnit === nextUnit ||
    (isInterchangeableMeasureUnit(currentUnit) &&
      isInterchangeableMeasureUnit(nextUnit))
  );
}

export function getEditableMeasureUnitOptions(
  currentUnit: MeasureUnit,
  isInUse: boolean,
): readonly SelectOption[] {
  return MEASURE_UNIT_VALUES.filter(
    (unit) => !isInUse || canChangeMeasureUnit(currentUnit, unit),
  ).map(toMeasureUnitOption);
}

export function getUnitSymbol(unit: MeasureUnit): string {
  return MEASURE_UNITS[unit].symbol;
}

const COST_DISPLAY_UNITS = {
  unit: { factor: 1, symbol: "un" },
  g: { factor: 1000, symbol: "kg" },
  kg: { factor: 1, symbol: "kg" },
  ml: { factor: 1000, symbol: "L" },
  l: { factor: 1, symbol: "L" },
} as const satisfies Record<MeasureUnit, { factor: number; symbol: string }>;

export function getDisplayUnitCost(
  unitCost: number,
  unit: MeasureUnit,
): { amount: number; symbol: string } {
  const { factor, symbol } = COST_DISPLAY_UNITS[unit];
  return { amount: unitCost * factor, symbol };
}

export type StockStatus = "out" | "low" | "ok";

export function getStockStatus(
  ingredient: Pick<Ingredient, "currentStock" | "minimumStock">,
): StockStatus {
  if (ingredient.currentStock <= 0) return "out";
  if (ingredient.currentStock <= ingredient.minimumStock) return "low";
  return "ok";
}
