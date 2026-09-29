import { getStockStatus } from "@/features/ingredients/measure-units";
import type { Ingredient } from "@/features/ingredients/types";
import type { Product } from "./types";

export const LOW_AVAILABILITY_THRESHOLD = 5;

const NO_RESERVED_QUANTITIES: ReadonlyMap<string, number> = new Map();

export type IngredientShortages = {
  outOfStockIngredientNames: string[];
  runningLowIngredientNames: string[];
};

export type ProductAvailability =
  | { status: "unlimited" }
  | ({ status: "available"; remaining: number } & IngredientShortages)
  | ({ status: "low"; remaining: number } & IngredientShortages)
  | ({ status: "out" } & IngredientShortages);

type IngredientCapacity = {
  ingredient: Ingredient | undefined;
  producibleQuantity: number;
};

function calculateIngredientCapacities(
  product: Product,
  ingredientsById: ReadonlyMap<string, Ingredient>,
  reservedQuantities: ReadonlyMap<string, number>,
): IngredientCapacity[] {
  return product.recipe.map((recipeItem) => {
    const ingredient = ingredientsById.get(recipeItem.ingredientId);
    if (!ingredient) return { ingredient, producibleQuantity: 0 };

    const freeStock =
      ingredient.currentStock -
      (reservedQuantities.get(recipeItem.ingredientId) ?? 0);

    return {
      ingredient,
      producibleQuantity: Math.max(
        0,
        Math.floor(freeStock / recipeItem.quantity),
      ),
    };
  });
}

function isRunningLow({ ingredient, producibleQuantity }: IngredientCapacity) {
  if (!ingredient || producibleQuantity === 0) return false;
  return (
    producibleQuantity <= LOW_AVAILABILITY_THRESHOLD ||
    getStockStatus(ingredient) !== "ok"
  );
}

function getIngredientNames(capacities: readonly IngredientCapacity[]) {
  return capacities.flatMap((capacity) =>
    capacity.ingredient ? [capacity.ingredient.name] : [],
  );
}

function getIngredientShortages(
  capacities: readonly IngredientCapacity[],
): IngredientShortages {
  return {
    outOfStockIngredientNames: getIngredientNames(
      capacities.filter((capacity) => capacity.producibleQuantity === 0),
    ),
    runningLowIngredientNames: getIngredientNames(
      capacities.filter(isRunningLow),
    ),
  };
}

export function getProductAvailability(
  product: Product,
  ingredientsById: ReadonlyMap<string, Ingredient>,
  reservedQuantities: ReadonlyMap<string, number> = NO_RESERVED_QUANTITIES,
): ProductAvailability {
  if (product.recipe.length === 0) return { status: "unlimited" };

  const capacities = calculateIngredientCapacities(
    product,
    ingredientsById,
    reservedQuantities,
  );
  const remaining = Math.min(
    ...capacities.map((capacity) => capacity.producibleQuantity),
  );
  const shortages = getIngredientShortages(capacities);

  if (remaining === 0) return { status: "out", ...shortages };
  if (remaining <= LOW_AVAILABILITY_THRESHOLD) {
    return { status: "low", remaining, ...shortages };
  }
  return { status: "available", remaining, ...shortages };
}

export function getAvailableQuantity(
  availability: ProductAvailability,
): number {
  if (availability.status === "unlimited") return Number.POSITIVE_INFINITY;
  if (availability.status === "out") return 0;
  return availability.remaining;
}
