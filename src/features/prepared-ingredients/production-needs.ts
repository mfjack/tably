import { isRunningLow } from "@/features/ingredients/shopping-list";
import type { Ingredient } from "@/features/ingredients/types";

export function needsProduction(ingredient: Ingredient): boolean {
  return ingredient.isPrepared && isRunningLow(ingredient);
}
