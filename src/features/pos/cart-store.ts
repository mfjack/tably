import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OrderTabTarget } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import type { ProductId } from "@/features/products/types";

export type CartItem = {
  productId: ProductId;
  quantity: number;
};

export type Cart = {
  items: CartItem[];
  note: string;
};

type CartState = {
  cartsByOrganization: Partial<Record<OrganizationId, Cart>>;
  tabTargetsByOrganization: Partial<Record<OrganizationId, OrderTabTarget>>;
  addProduct: (organizationId: OrganizationId, productId: ProductId) => void;
  decrementProduct: (
    organizationId: OrganizationId,
    productId: ProductId,
  ) => void;
  setNote: (organizationId: OrganizationId, note: string) => void;
  clearCart: (organizationId: OrganizationId) => void;
  setTabTarget: (
    organizationId: OrganizationId,
    tabTarget: OrderTabTarget | null,
  ) => void;
};

export const EMPTY_CART: Cart = { items: [], note: "" };

function addToItems(items: CartItem[], productId: ProductId): CartItem[] {
  const hasProduct = items.some((item) => item.productId === productId);

  return hasProduct
    ? items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      )
    : [...items, { productId, quantity: 1 }];
}

function decrementFromItems(
  items: CartItem[],
  productId: ProductId,
): CartItem[] {
  return items
    .map((item) =>
      item.productId === productId
        ? { ...item, quantity: item.quantity - 1 }
        : item,
    )
    .filter((item) => item.quantity > 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => {
      function updateCart(
        organizationId: OrganizationId,
        updater: (cart: Cart) => Cart,
      ) {
        set((state) => ({
          cartsByOrganization: {
            ...state.cartsByOrganization,
            [organizationId]: updater(
              state.cartsByOrganization[organizationId] ?? EMPTY_CART,
            ),
          },
        }));
      }

      return {
        cartsByOrganization: {},
        tabTargetsByOrganization: {},
        addProduct: (organizationId, productId) =>
          updateCart(organizationId, (cart) => ({
            ...cart,
            items: addToItems(cart.items, productId),
          })),
        decrementProduct: (organizationId, productId) =>
          updateCart(organizationId, (cart) => ({
            ...cart,
            items: decrementFromItems(cart.items, productId),
          })),
        setNote: (organizationId, note) =>
          updateCart(organizationId, (cart) => ({ ...cart, note })),
        clearCart: (organizationId) =>
          updateCart(organizationId, () => EMPTY_CART),
        setTabTarget: (organizationId, tabTarget) =>
          set((state) => ({
            tabTargetsByOrganization: {
              ...state.tabTargetsByOrganization,
              [organizationId]: tabTarget ?? undefined,
            },
          })),
      };
    },
    {
      name: "tably-pos-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cartsByOrganization: state.cartsByOrganization,
        tabTargetsByOrganization: state.tabTargetsByOrganization,
      }),
      skipHydration: true,
    },
  ),
);

export function useCart(organizationId: OrganizationId): Cart {
  return useCartStore(
    (state) => state.cartsByOrganization[organizationId] ?? EMPTY_CART,
  );
}

export function useTabTarget(
  organizationId: OrganizationId,
): OrderTabTarget | null {
  return useCartStore(
    (state) => state.tabTargetsByOrganization[organizationId] ?? null,
  );
}

function subscribeToHydration(onChange: () => void) {
  return useCartStore.persist.onFinishHydration(onChange);
}

function getIsHydrated() {
  return useCartStore.persist.hasHydrated();
}

function getIsHydratedOnServer() {
  return false;
}

export function useHydratedCartStore(): boolean {
  useEffect(() => {
    if (!useCartStore.persist.hasHydrated()) {
      void useCartStore.persist.rehydrate();
    }
  }, []);

  return useSyncExternalStore(
    subscribeToHydration,
    getIsHydrated,
    getIsHydratedOnServer,
  );
}
