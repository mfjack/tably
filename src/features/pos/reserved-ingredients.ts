import { resolveSelectedAddons } from "@/features/product-addons/item-addons";
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
    for (const addon of resolveSelectedAddons(
      cartItem.addonIds,
      product.addons,
    )) {
      if (addon.ingredientId && addon.ingredientQuantity !== null) {
        reserve(
          addon.ingredientId,
          addon.ingredientQuantity * cartItem.quantity,
        );
      }
    }
  }

  return reservedQuantities;
}
