import { useCallback, useMemo } from "react";
import { useCategoriesQuery } from "@/features/categories/hooks/use-categories-query";
import { useIngredientsMap } from "@/features/ingredients/hooks/use-ingredients-map";
import type { OrderItemInput } from "@/features/orders/schemas";
import type { OrganizationId } from "@/features/organizations/types";
import { type Cart, getCartItemKey } from "@/features/pos/cart-store";
import { buildReservedIngredientQuantities } from "@/features/pos/reserved-ingredients";
import { isAddonAvailable } from "@/features/product-addons/availability";
import type { AddonOption } from "@/features/product-addons/components/addon-picker-dialog";
import {
  formatItemNameWithAddons,
  getAddonsTotal,
} from "@/features/product-addons/item-addons";
import type { ProductAddon } from "@/features/product-addons/types";
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
  addons: ProductAddon[];
  cartAddonIds: string[];
  displayName: string;
  quantity: number;
  unitPrice: number;
  note: string;
  total: number;
};

export function getCartLineAddonNames(cartLine: CartLine): string[] {
  return cartLine.addons.map((addon) => addon.name);
}

export function toOrderItemInput(cartLine: CartLine): OrderItemInput {
  return {
    productId: cartLine.product.id,
    quantity: cartLine.quantity,
    note: cartLine.note || undefined,
    addonIds: cartLine.addons.map((addon) => addon.id),
  };
}

function buildCartLine(
  cartItem: Cart["items"][number],
  product: Product,
): CartLine {
  const addonIds = new Set(cartItem.addonIds ?? []);
  const addons = product.addons.filter((addon) => addonIds.has(addon.id));
  const unitPrice = product.price + getAddonsTotal(addons);
  return {
    key: getCartItemKey(cartItem),
    product,
    addons,
    cartAddonIds: cartItem.addonIds ?? [],
    displayName: formatItemNameWithAddons(product.name, addons),
    quantity: cartItem.quantity,
    unitPrice,
    note: cartItem.note,
    total: unitPrice * cartItem.quantity,
  };
}

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
        return product ? [buildCartLine(cartItem, product)] : [];
      }),
    [productsById],
  );

  const cartLines = useMemo(
    () => buildCartLines(cart.items),
    [buildCartLines, cart.items],
  );

  const reservedQuantities = useMemo(
    () => buildReservedIngredientQuantities(cart.items, productsById),
    [cart.items, productsById],
  );

  const getAddonOptions = useCallback(
    (product: Product): AddonOption[] =>
      product.addons
        .filter((addon) => addon.isActive)
        .map((addon) => ({
          id: addon.id,
          name: addon.name,
          price: addon.price,
          isAvailable: isAddonAvailable(
            addon,
            ingredientsById,
            reservedQuantities,
          ),
        })),
    [ingredientsById, reservedQuantities],
  );

  const posProducts = useMemo<PosProduct[]>(() => {
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
  }, [activeProducts, cart.items, ingredientsById, reservedQuantities]);

  return {
    posProducts,
    cartLines,
    buildCartLines,
    getAddonOptions,
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
