import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OrderTabTarget } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import type { ProductId } from "@/features/products/types";

export type CartItem = {
  productId: ProductId;
  quantity: number;
  note: string;
};

export const CART_ITEM_NOTE_MAX_LENGTH = 140;

export type Cart = {
  items: CartItem[];
  note: string;
};

type CartState = {
  cartsByOrganization: Partial<Record<OrganizationId, Cart>>;
  tabTargetsByOrganization: Partial<Record<OrganizationId, OrderTabTarget>>;
  addProduct: (organizationId: OrganizationId, productId: ProductId) => void;
  decrementItem: (
    organizationId: OrganizationId,
    productId: ProductId,
    note: string,
  ) => void;
  setItemNote: (
    organizationId: OrganizationId,
    productId: ProductId,
    currentNote: string,
    nextNote: string,
    quantityToMove: number,
  ) => void;
  setNote: (organizationId: OrganizationId, note: string) => void;
  clearCart: (organizationId: OrganizationId) => void;
  setTabTarget: (
    organizationId: OrganizationId,
    tabTarget: OrderTabTarget | null,
  ) => void;
};

export const EMPTY_CART: Cart = { items: [], note: "" };

type PersistedCartState = Pick<
  CartState,
  "cartsByOrganization" | "tabTargetsByOrganization"
>;

const CART_STORE_VERSION = 1;

export function getCartItemKey(item: Pick<CartItem, "productId" | "note">) {
  return `${item.productId}:${item.note}`;
}

function isSameLine(item: CartItem, productId: ProductId, note: string) {
  return item.productId === productId && item.note === note;
}

function addToItems(items: CartItem[], productId: ProductId): CartItem[] {
  const hasLine = items.some((item) => isSameLine(item, productId, ""));

  return hasLine
    ? items.map((item) =>
        isSameLine(item, productId, "")
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      )
    : [...items, { productId, quantity: 1, note: "" }];
}

function decrementFromItems(
  items: CartItem[],
  productId: ProductId,
  note: string,
): CartItem[] {
  return items
    .map((item) =>
      isSameLine(item, productId, note)
        ? { ...item, quantity: item.quantity - 1 }
        : item,
    )
    .filter((item) => item.quantity > 0);
}

function updateItemNote(
  items: CartItem[],
  productId: ProductId,
  currentNote: string,
  nextNote: string,
  quantityToMove: number,
): CartItem[] {
  const normalizedNote = nextNote.trim().slice(0, CART_ITEM_NOTE_MAX_LENGTH);
  const editedItem = items.find((item) =>
    isSameLine(item, productId, currentNote),
  );
  if (!editedItem || normalizedNote === currentNote) return items;

  const movedQuantity = Math.min(
    Math.max(quantityToMove, 1),
    editedItem.quantity,
  );
  const remainingQuantity = editedItem.quantity - movedQuantity;
  const hasTargetLine = items.some((item) =>
    isSameLine(item, productId, normalizedNote),
  );

  if (hasTargetLine) {
    return items.flatMap((item) => {
      if (item === editedItem) {
        return remainingQuantity > 0
          ? [{ ...item, quantity: remainingQuantity }]
          : [];
      }
      return isSameLine(item, productId, normalizedNote)
        ? [{ ...item, quantity: item.quantity + movedQuantity }]
        : [item];
    });
  }

  return items.flatMap((item) => {
    if (item !== editedItem) return [item];
    const movedItem = {
      ...item,
      note: normalizedNote,
      quantity: movedQuantity,
    };
    return remainingQuantity > 0
      ? [{ ...item, quantity: remainingQuantity }, movedItem]
      : [movedItem];
  });
}

function migrateCartState(persistedState: unknown): PersistedCartState {
  const state = persistedState as PersistedCartState;
  const cartsByOrganization = Object.fromEntries(
    Object.entries(state.cartsByOrganization ?? {}).map(
      ([organizationId, cart]) => [
        organizationId,
        cart && {
          ...cart,
          items: cart.items.map((item) => ({ ...item, note: item.note ?? "" })),
        },
      ],
    ),
  ) as PersistedCartState["cartsByOrganization"];

  return {
    cartsByOrganization,
    tabTargetsByOrganization: state.tabTargetsByOrganization ?? {},
  };
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
        decrementItem: (organizationId, productId, note) =>
          updateCart(organizationId, (cart) => ({
            ...cart,
            items: decrementFromItems(cart.items, productId, note),
          })),
        setItemNote: (
          organizationId,
          productId,
          currentNote,
          nextNote,
          quantityToMove,
        ) =>
          updateCart(organizationId, (cart) => ({
            ...cart,
            items: updateItemNote(
              cart.items,
              productId,
              currentNote,
              nextNote,
              quantityToMove,
            ),
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
      version: CART_STORE_VERSION,
      migrate: migrateCartState,
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
