import type { Ingredient } from "@/features/ingredients/types";

type RecipeLine = {
  ingredientId?: string;
  quantity?: number;
};

export type ProductPricing = {
  cost: number;
  costRatio: number | null;
  profit: number;
  margin: number | null;
};

export function calculateRecipeLineCost(
  recipeLine: RecipeLine,
  ingredientsById: ReadonlyMap<string, Ingredient>,
): number {
  const ingredient = recipeLine.ingredientId
    ? ingredientsById.get(recipeLine.ingredientId)
    : undefined;
  const quantity = recipeLine.quantity ?? 0;
  return ingredient && Number.isFinite(quantity)
    ? quantity * ingredient.unitCost
    : 0;
}

export function calculateProductPricing(
  price: number,
  cost: number,
): ProductPricing {
  const profit = price - cost;
  const hasPrice = price > 0;
  return {
    cost,
    costRatio: hasPrice ? cost / price : null,
    profit,
    margin: hasPrice ? profit / price : null,
  };
}

export function calculateRecipePricing(
  price: number,
  recipe: readonly RecipeLine[],
  ingredientsById: ReadonlyMap<string, Ingredient>,
): ProductPricing {
  const cost = recipe.reduce(
    (total, recipeLine) =>
      total + calculateRecipeLineCost(recipeLine, ingredientsById),
    0,
  );
  return calculateProductPricing(price, cost);
}
