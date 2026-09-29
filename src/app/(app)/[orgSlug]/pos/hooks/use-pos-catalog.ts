import { useMemo } from "react";
import { useCategoriesQuery } from "@/features/categories/hooks/use-categories-query";
import { useIngredientsMap } from "@/features/ingredients/hooks/use-ingredients-map";
import type { OrganizationId } from "@/features/organizations/types";
import type { Cart } from "@/features/pos/cart-store";
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
  product: Product;
  quantity: number;
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

  const cartLines = useMemo<CartLine[]>(
    () =>
      cart.items.flatMap((cartItem) => {
        const product = productsById.get(cartItem.productId);
        return product
          ? [
              {
                product,
                quantity: cartItem.quantity,
                total: product.price * cartItem.quantity,
              },
            ]
          : [];
      }),
    [cart.items, productsById],
  );

  const posProducts = useMemo<PosProduct[]>(() => {
    const reservedQuantities = buildReservedIngredientQuantities(
      cart.items,
      productsById,
    );
    const cartQuantities = new Map(
      cart.items.map((cartItem) => [cartItem.productId, cartItem.quantity]),
    );

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
    categories: categoriesQuery.data,
    isLoading:
      productsQuery.isPending ||
      isLoadingIngredients ||
      categoriesQuery.isPending,
    errorMessage:
      productsQuery.error?.message ??
      ingredientsErrorMessage ??
      categoriesQuery.error?.message,
  };
}
