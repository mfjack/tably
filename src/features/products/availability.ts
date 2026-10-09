import type {
  Ingredient,
  IngredientId,
  MeasureUnit,
} from "@/features/ingredients/types";
import type { Product } from "./types";

const NO_RESERVED_QUANTITIES: ReadonlyMap<string, number> = new Map();

export type IngredientStockLevel = {
  ingredientId: IngredientId;
  name: string;
  unit: MeasureUnit;
  stock: number;
  minimumStock: number;
};

export type IngredientShortages = {
  outOfStockIngredientNames: string[];
  runningLowIngredientNames: string[];
  stockLevels: IngredientStockLevel[];
};

type LimitedAvailability = IngredientShortages & {
  remaining: number;
};

export type ProductAvailability =
  | { status: "unlimited" }
  | ({ status: "available" } & LimitedAvailability)
  | ({ status: "low" } & LimitedAvailability)
  | ({ status: "out" } & IngredientShortages);

type IngredientCapacity = {
  ingredient: Ingredient | undefined;
  freeStock: number;
  producibleQuantity: number;
};

function calculateIngredientCapacities(
  product: Product,
  ingredientsById: ReadonlyMap<string, Ingredient>,
  reservedQuantities: ReadonlyMap<string, number>,
): IngredientCapacity[] {
  return product.recipe.map((recipeItem) => {
    const ingredient = ingredientsById.get(recipeItem.ingredientId);
    if (!ingredient) return { ingredient, freeStock: 0, producibleQuantity: 0 };

    const freeStock =
      ingredient.currentStock -
      (reservedQuantities.get(recipeItem.ingredientId) ?? 0);

    return {
      ingredient,
      freeStock,
      producibleQuantity: Math.max(
        0,
        Math.floor(freeStock / recipeItem.quantity),
      ),
    };
  });
}

function isRunningLow({
  ingredient,
  freeStock,
  producibleQuantity,
}: IngredientCapacity) {
  if (!ingredient || producibleQuantity === 0) return false;
  return freeStock <= ingredient.minimumStock;
}

function getIngredientNames(capacities: readonly IngredientCapacity[]) {
  return capacities.flatMap((capacity) =>
    capacity.ingredient ? [capacity.ingredient.name] : [],
  );
}

function toStockLevel({
  ingredient,
  freeStock,
}: IngredientCapacity): IngredientStockLevel[] {
  return ingredient
    ? [
        {
          ingredientId: ingredient.id,
          name: ingredient.name,
          unit: ingredient.unit,
          stock: Math.max(freeStock, 0),
          minimumStock: ingredient.minimumStock,
        },
      ]
    : [];
}

function getStockLevels(
  capacities: readonly IngredientCapacity[],
): IngredientStockLevel[] {
  const remaining = Math.min(
    ...capacities.map((capacity) => capacity.producibleQuantity),
  );
  const relevantCapacities = capacities.filter(
    (capacity) =>
      capacity.producibleQuantity === remaining || isRunningLow(capacity),
  );
  return [...relevantCapacities]
    .sort(
      (first, second) => first.producibleQuantity - second.producibleQuantity,
    )
    .flatMap(toStockLevel);
}

function getIngredientShortages(
  capacities: readonly IngredientCapacity[],
): IngredientShortages {
  return {
    stockLevels: getStockLevels(capacities),
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
  const limitedAvailability = { remaining, ...shortages };
  if (shortages.runningLowIngredientNames.length > 0) {
    return { status: "low", ...limitedAvailability };
  }
  return { status: "available", ...limitedAvailability };
}

export function getAvailableQuantity(
  availability: ProductAvailability,
): number {
  if (availability.status === "unlimited") return Number.POSITIVE_INFINITY;
  if (availability.status === "out") return 0;
  return availability.remaining;
}
