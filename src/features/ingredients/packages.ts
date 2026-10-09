import { formatQuantity } from "@/lib/format";
import { getUnitSymbol } from "./measure-units";
import type { MeasureUnit } from "./types";

export type IngredientPackage = {
  packageName: string | null;
  packageSize: number | null;
  unit: MeasureUnit;
};

const PACKAGE_COUNT_DECIMALS = 10;

export function hasPackage(
  ingredient: IngredientPackage,
): ingredient is IngredientPackage & {
  packageName: string;
  packageSize: number;
} {
  return Boolean(ingredient.packageName && ingredient.packageSize);
}

export function pluralizePackageName(name: string, count: number): string {
  if (count <= 1 || name.endsWith("s")) return name;
  return `${name}s`;
}

export function formatPackageCount(count: number, name: string): string {
  const rounded =
    Math.round(count * PACKAGE_COUNT_DECIMALS) / PACKAGE_COUNT_DECIMALS;
  return `${formatQuantity(rounded)} ${pluralizePackageName(name, rounded)}`;
}

export function formatPackageSize(
  ingredient: IngredientPackage,
): string | null {
  if (!hasPackage(ingredient)) return null;
  return `${formatQuantity(ingredient.packageSize)} ${getUnitSymbol(ingredient.unit)}`;
}

export function toStockQuantity(
  ingredient: IngredientPackage,
  typedQuantity: number,
): number {
  return hasPackage(ingredient)
    ? typedQuantity * ingredient.packageSize
    : typedQuantity;
}

export function toPackageQuantity(
  ingredient: IngredientPackage,
  stockQuantity: number,
): number {
  return hasPackage(ingredient)
    ? stockQuantity / ingredient.packageSize
    : stockQuantity;
}

export function getQuantitySuffix(
  ingredient: IngredientPackage,
  quantity?: number,
): string {
  return hasPackage(ingredient)
    ? pluralizePackageName(ingredient.packageName, quantity ?? 1)
    : getUnitSymbol(ingredient.unit);
}

export function describeStockEquivalent(
  ingredient: IngredientPackage,
  typedQuantity: number | undefined,
): string | undefined {
  if (!hasPackage(ingredient) || !typedQuantity) return undefined;
  return `= ${formatQuantity(typedQuantity * ingredient.packageSize)} ${getUnitSymbol(ingredient.unit)}`;
}
