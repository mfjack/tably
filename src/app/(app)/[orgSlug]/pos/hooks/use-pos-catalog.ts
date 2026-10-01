import { useCallback, useMemo } from "react";
import { useCategoriesQuery } from "@/features/categories/hooks/use-categories-query";
import { useIngredientsMap } from "@/features/ingredients/hooks/use-ingredients-map";
import type { OrganizationId } from "@/features/organizations/types";
import { type Cart, getCartItemKey } from "@/features/pos/cart-store";
import { buildReservedIngredientQuantities } from "@/features/pos/reserved-ingredients";
import {
  getProductAvailability,
  type ProductAvailability,
} from "@/features/products/availability";
import { useProductsQuery } from "@/features/products/hooks/use-products-query";
import type { Product, ProductId } from "@/features/products/types";

const EMPTY_PRODUCTS: Product[] = [];

export type PosProduct = Product & {
  availability: ProductAvailability;
  cartQuantity: number;
};

export type CartLine = {
  key: string;
  product: Product;
  quantity: number;
  note: string;
  total: number;
};

export function usePosCatalog(organizationId: OrganizationId, cart: Cart) {
  const productsQuery = useProductsQuery(organizationId);
  const {
    ingredientsById,
    isPending: isLoadingIngredients,
    errorMessage: ingredientsErrorMessage,
  } = useIngredientsMap(organizationId);
  const categoriesQuery = useCategoriesQuery(organizationId);

  const activeProducts = useMemo(
    () =>
      (productsQuery.data ?? EMPTY_PRODUCTS).filter(
        (product) => product.isActive,
      ),
    [productsQuery.data],
  );

  const productsById = useMemo(
    () =>
      new Map<ProductId, Product>(
        activeProducts.map((product) => [product.id, product]),
      ),
    [activeProducts],
  );

  const buildCartLines = useCallback(
    (cartItems: Cart["items"]): CartLine[] =>
      cartItems.flatMap((cartItem) => {
        const product = productsById.get(cartItem.productId);
        return product
          ? [
              {
                key: getCartItemKey(cartItem),
                product,
                quantity: cartItem.quantity,
                note: cartItem.note,
                total: product.price * cartItem.quantity,
              },
            ]
          : [];
      }),
    [productsById],
  );

  const cartLines = useMemo(
    () => buildCartLines(cart.items),
    [buildCartLines, cart.items],
  );

  const posProducts = useMemo<PosProduct[]>(() => {
    const reservedQuantities = buildReservedIngredientQuantities(
      cart.items,
      productsById,
    );
    const cartQuantities = new Map<ProductId, number>();
    for (const cartItem of cart.items) {
      cartQuantities.set(
        cartItem.productId,
        (cartQuantities.get(cartItem.productId) ?? 0) + cartItem.quantity,
      );
    }

    return activeProducts.map((product) => ({
      ...product,
      availability: getProductAvailability(
        product,
        ingredientsById,
        reservedQuantities,
      ),
      cartQuantity: cartQuantities.get(product.id) ?? 0,
    }));
  }, [activeProducts, cart.items, ingredientsById, productsById]);

  return {
    posProducts,
    cartLines,
    buildCartLines,
    categories: categoriesQuery.data,
    isLoading:
      productsQuery.isPending ||
      isLoadingIngredients ||
      categoriesQuery.isPending,
    errorMessage:
      (productsQuery.data ? undefined : productsQuery.error?.message) ??
      ingredientsErrorMessage ??
      (categoriesQuery.data ? undefined : categoriesQuery.error?.message),
  };
}
