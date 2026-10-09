import type { StorageCondition } from "@/features/food-labels/labels";
import type { SupplierId } from "@/features/suppliers/types";
import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type IngredientId = Brand<string, "IngredientId">;

export type MeasureUnit = Database["public"]["Enums"]["measure_unit"];

export type Ingredient = {
  id: IngredientId;
  name: string;
  brand: string | null;
  unit: MeasureUnit;
  currentStock: number;
  minimumStock: number;
  unitCost: number;
  supplierId: SupplierId | null;
  expiresAt: string | null;
  recipeCount: number;
  isInUse: boolean;
  labelShelfLifeHours: number | null;
  labelStorage: StorageCondition | null;
  isPrepared: boolean;
  yieldQuantity: number | null;
  preparationInstructions: string | null;
  components: IngredientComponent[];
};

export type IngredientComponent = {
  ingredientId: IngredientId;
  quantity: number;
};
