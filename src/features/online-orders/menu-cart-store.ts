import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  addToItems,
  type CartItem,
  decrementFromItems,
  updateItemNote,
} from "@/features/pos/cart-items";
import type { ProductId } from "@/features/products/types";
import type { OnlineOrderDeviceId, OnlineOrderId } from "./types";

const RECENT_ORDER_LIFETIME_IN_MILLISECONDS = 12 * 60 * 60 * 1000;
const MAX_RECENT_ORDERS = 5;

export type MenuCartItem = CartItem;

export type RecentOnlineOrder = {
  id: OnlineOrderId;
  createdAt: string;
};

type MenuCartState = {
  deviceId: OnlineOrderDeviceId | null;
  customerName: string;
  customerPhone: string;
  itemsByMenu: Record<string, MenuCartItem[] | undefined>;
  recentOrdersByMenu: Record<string, RecentOnlineOrder[] | undefined>;
  getDeviceId: () => OnlineOrderDeviceId;
  incrementItem: (
    menuSlug: string,
    productId: ProductId,
    addonIds?: readonly string[],
  ) => void;
  decrementItem: (
    menuSlug: string,
    productId: ProductId,
    note?: string,
    addonIds?: readonly string[],
  ) => void;
  setItemNote: (
    menuSlug: string,
    productId: ProductId,
    currentNote: string,
    nextNote: string,
    quantityToMove: number,
    addonIds?: readonly string[],
  ) => void;
  clearCart: (menuSlug: string) => void;
  setCustomerName: (customerName: string) => void;
  setCustomerPhone: (customerPhone: string) => void;
  addRecentOrder: (menuSlug: string, onlineOrderId: OnlineOrderId) => void;
};

const EMPTY_ITEMS: readonly MenuCartItem[] = [];
const EMPTY_RECENT_ORDERS: readonly RecentOnlineOrder[] = [];

function isRecent(order: RecentOnlineOrder) {
  return (
    Date.now() - new Date(order.createdAt).getTime() <
    RECENT_ORDER_LIFETIME_IN_MILLISECONDS
  );
}

function findLastNote(items: readonly MenuCartItem[], productId: ProductId) {
  const productItems = items.filter((item) => item.productId === productId);
  return (
    (productItems.find((item) => item.note === "") ?? productItems.at(-1))
      ?.note ?? ""
  );
}

function migrateMenuCartState(persistedState: unknown) {
  const state = persistedState as Partial<MenuCartState>;
  const itemsByMenu = Object.fromEntries(
    Object.entries(state.itemsByMenu ?? {}).map(([menuSlug, items]) => [
      menuSlug,
      (items ?? []).map((item) => ({ ...item, note: item.note ?? "" })),
    ]),
  );
  return { ...state, itemsByMenu } as MenuCartState;
}

export const useMenuCartStore = create<MenuCartState>()(
  persist(
    (set, get) => {
      function updateItems(
        menuSlug: string,
        update: (items: MenuCartItem[]) => MenuCartItem[],
      ) {
        set((state) => ({
          itemsByMenu: {
            ...state.itemsByMenu,
            [menuSlug]: update(state.itemsByMenu[menuSlug] ?? []),
          },
        }));
      }

      return {
        deviceId: null,
        customerName: "",
        customerPhone: "",
        itemsByMenu: {},
        recentOrdersByMenu: {},
        getDeviceId: () => {
          const currentDeviceId = get().deviceId;
          if (currentDeviceId) return currentDeviceId;

          const deviceId = crypto.randomUUID() as OnlineOrderDeviceId;
          set({ deviceId });
          return deviceId;
        },
        incrementItem: (menuSlug, productId, addonIds) =>
          updateItems(menuSlug, (items) =>
            addToItems(items, productId, addonIds),
          ),
        decrementItem: (menuSlug, productId, note, addonIds) =>
          updateItems(menuSlug, (items) =>
            decrementFromItems(
              items,
              productId,
              note ?? findLastNote(items, productId),
              addonIds,
            ),
          ),
        setItemNote: (
          menuSlug,
          productId,
          currentNote,
          nextNote,
          quantityToMove,
          addonIds,
        ) =>
          updateItems(menuSlug, (items) =>
            updateItemNote(
              items,
              productId,
              currentNote,
              nextNote,
              quantityToMove,
              addonIds,
            ),
          ),
        clearCart: (menuSlug) =>
          set((state) => ({
            itemsByMenu: { ...state.itemsByMenu, [menuSlug]: [] },
          })),
        setCustomerName: (customerName) => set({ customerName }),
        setCustomerPhone: (customerPhone) => set({ customerPhone }),
        addRecentOrder: (menuSlug, onlineOrderId) =>
          set((state) => ({
            recentOrdersByMenu: {
              ...state.recentOrdersByMenu,
              [menuSlug]: [
                { id: onlineOrderId, createdAt: new Date().toISOString() },
                ...(state.recentOrdersByMenu[menuSlug] ?? []).filter(isRecent),
              ].slice(0, MAX_RECENT_ORDERS),
            },
          })),
      };
    },
    {
      name: "tably-menu-cart",
      version: 2,
      migrate: migrateMenuCartState,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export function useMenuCartItems(menuSlug: string): readonly MenuCartItem[] {
  return useMenuCartStore(
    (state) => state.itemsByMenu[menuSlug] ?? EMPTY_ITEMS,
  );
}

export function useMenuCartItemQuantity(
  menuSlug: string,
  productId: ProductId,
): number {
  return useMenuCartStore((state) =>
    (state.itemsByMenu[menuSlug] ?? [])
      .filter((item) => item.productId === productId)
      .reduce((total, item) => total + item.quantity, 0),
  );
}

export function useLatestRecentOrder(
  menuSlug: string,
): RecentOnlineOrder | null {
  const recentOrders = useMenuCartStore(
    (state) => state.recentOrdersByMenu[menuSlug] ?? EMPTY_RECENT_ORDERS,
  );
  return recentOrders.find(isRecent) ?? null;
}

function subscribeToHydration(onChange: () => void) {
  return useMenuCartStore.persist.onFinishHydration(onChange);
}

function getIsHydrated() {
  return useMenuCartStore.persist.hasHydrated();
}

function getIsHydratedOnServer() {
  return false;
}

export function useHydratedMenuCartStore(): boolean {
  useEffect(() => {
    if (!useMenuCartStore.persist.hasHydrated()) {
      void useMenuCartStore.persist.rehydrate();
    }
  }, []);

  return useSyncExternalStore(
    subscribeToHydration,
    getIsHydrated,
    getIsHydratedOnServer,
  );
}
