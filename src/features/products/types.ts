import type { CategoryId } from "@/features/categories/types";
import type { IngredientId } from "@/features/ingredients/types";
import type { Brand } from "@/lib/brand";

export type ProductId = Brand<string, "ProductId">;

export type RecipeItem = {
  ingredientId: IngredientId;
  quantity: number;
};

export type Product = {
  id: ProductId;
  name: string;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  categoryId: CategoryId | null;
  categoryName: string | null;
  unitCost: number;
  recipe: RecipeItem[];
  isOnMenu: boolean;
  menuDetail: string | null;
};
