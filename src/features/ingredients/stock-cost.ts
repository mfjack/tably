import type { Ingredient } from "./types";

export type StockEntryProjection = {
  stock: number;
  unitCost: number;
};

export function getPurchaseCost(
  totalCost: number | undefined,
  freightCost: number | undefined,
): number {
  return (totalCost ?? 0) + (freightCost ?? 0);
}

export function projectStockEntry(
  ingredient: Pick<Ingredient, "currentStock" | "unitCost">,
  quantity: number,
  totalCost: number,
): StockEntryProjection {
  const countableStock = Math.max(ingredient.currentStock, 0);
  const projectedStock = countableStock + quantity;

  return {
    stock: ingredient.currentStock + quantity,
    unitCost:
      projectedStock > 0
        ? (countableStock * ingredient.unitCost + totalCost) / projectedStock
        : ingredient.unitCost,
  };
}
