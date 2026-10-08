import type { Ingredient } from "@/features/ingredients/types";
import type { ProductAddon } from "./types";

export function isAddonAvailable(
  addon: ProductAddon,
  ingredientsById: ReadonlyMap<string, Ingredient>,
  reservedQuantities: ReadonlyMap<string, number>,
): boolean {
  if (!addon.ingredientId || addon.ingredientQuantity === null) return true;
  const ingredient = ingredientsById.get(addon.ingredientId);
  if (!ingredient) return true;
  const freeStock =
    ingredient.currentStock - (reservedQuantities.get(ingredient.id) ?? 0);
  return freeStock >= addon.ingredientQuantity;
}
