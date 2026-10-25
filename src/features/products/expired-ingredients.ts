import type { Ingredient } from "@/features/ingredients/types";
import { getExpiryStatus } from "@/lib/expiry";
import type { Product } from "./types";

export function getExpiredIngredientNames(
  product: Pick<Product, "recipe">,
  ingredientsById: ReadonlyMap<string, Ingredient>,
): string[] {
  return product.recipe.flatMap((recipeItem) => {
    const ingredient = ingredientsById.get(recipeItem.ingredientId);
    return ingredient &&
      getExpiryStatus(ingredient.expiresAt).status === "expired"
      ? [ingredient.name]
      : [];
  });
}
