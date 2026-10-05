import type { SelectableMeasureUnit } from "@/features/ingredients/measure-units";
import type { MeasureUnit } from "@/features/ingredients/types";

const PACKAGE_SIZE_PATTERN = /(\d+(?:[.,]\d+)?)\s*(KG|G|GR|L|LT|ML)\b/i;
const MIN_WORD_LENGTH = 3;
const GRAMS_PER_KILO = 1000;
const MILLILITERS_PER_LITER = 1000;

type PackageSize = {
  unit: Exclude<SelectableMeasureUnit, "unit">;
  amount: number;
};

type IngredientCandidate = {
  id: string;
  name: string;
};

export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function detectPackageSize(description: string): PackageSize | null {
  const match = description.match(PACKAGE_SIZE_PATTERN);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  const unit = match[2].toUpperCase();
  if (unit === "KG") return { unit: "g", amount: amount * GRAMS_PER_KILO };
  if (unit === "G" || unit === "GR") return { unit: "g", amount };
  if (unit === "L" || unit === "LT") {
    return { unit: "ml", amount: amount * MILLILITERS_PER_LITER };
  }
  return { unit: "ml", amount };
}

export function suggestUnitsPerPackage(
  description: string,
  ingredientUnit: MeasureUnit,
): number | null {
  if (ingredientUnit === "unit") return 1;
  const packageSize = detectPackageSize(description);
  return packageSize?.unit === ingredientUnit ? packageSize.amount : null;
}

export function suggestNewIngredientUnit(
  description: string,
): SelectableMeasureUnit {
  return detectPackageSize(description)?.unit ?? "unit";
}

export function findSimilarIngredient<TIngredient extends IngredientCandidate>(
  description: string,
  ingredients: readonly TIngredient[],
): TIngredient | null {
  const normalizedDescription = normalizeText(description);
  let bestMatch: TIngredient | null = null;
  let bestScore = 0;

  for (const ingredient of ingredients) {
    const words = normalizeText(ingredient.name)
      .split(/\s+/)
      .filter((word) => word.length >= MIN_WORD_LENGTH);
    const isMatch =
      words.length > 0 &&
      words.every((word) => normalizedDescription.includes(word));
    if (isMatch && words.length > bestScore) {
      bestMatch = ingredient;
      bestScore = words.length;
    }
  }
  return bestMatch;
}

export function toIngredientName(description: string): string {
  return description
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
