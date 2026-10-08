import type { Product, ProductId } from "@/features/products/types";
import type { CartItem } from "./cart-store";

export function buildReservedIngredientQuantities(
  cartItems: readonly CartItem[],
  productsById: ReadonlyMap<ProductId, Product>,
): Map<string, number> {
  const reservedQuantities = new Map<string, number>();

  function reserve(ingredientId: string, quantity: number) {
    reservedQuantities.set(
      ingredientId,
      (reservedQuantities.get(ingredientId) ?? 0) + quantity,
    );
  }

  for (const cartItem of cartItems) {
    const product = productsById.get(cartItem.productId);
    if (!product) continue;
    for (const recipeItem of product.recipe) {
      reserve(recipeItem.ingredientId, recipeItem.quantity * cartItem.quantity);
    }
    const addonIds = new Set(cartItem.addonIds ?? []);
    for (const addon of product.addons) {
      if (
        addonIds.has(addon.id) &&
        addon.ingredientId &&
        addon.ingredientQuantity !== null
      ) {
        reserve(
          addon.ingredientId,
          addon.ingredientQuantity * cartItem.quantity,
        );
      }
    }
  }

  return reservedQuantities;
}
