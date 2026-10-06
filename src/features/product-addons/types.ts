import type { IngredientId } from "@/features/ingredients/types";
import type { Brand } from "@/lib/brand";

export type ProductAddonId = Brand<string, "ProductAddonId">;

export type ProductAddon = {
  id: ProductAddonId;
  name: string;
  price: number;
  isActive: boolean;
  ingredientId: IngredientId | null;
  ingredientQuantity: number | null;
};

export type OrderItemAddon = {
  addonId: ProductAddonId;
  name: string;
  price: number;
};
