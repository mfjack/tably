import type { Product, ProductId } from "@/features/products/types";
import type { CartItem } from "./cart-store";

export function buildReservedIngredientQuantities(
  cartItems: readonly CartItem[],
  productsById: ReadonlyMap<ProductId, Product>,
): Map<string, number> {
  const reservedQuantities = new Map<string, number>();

  for (const cartItem of cartItems) {
    const product = productsById.get(cartItem.productId);
    for (const recipeItem of product?.recipe ?? []) {
      reservedQuantities.set(
        recipeItem.ingredientId,
        (reservedQuantities.get(recipeItem.ingredientId) ?? 0) +
          recipeItem.quantity * cartItem.quantity,
      );
    }
  }

  return reservedQuantities;
}
