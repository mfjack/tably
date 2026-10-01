import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OrderTabTarget } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import type { ProductId } from "@/features/products/types";
import type { Brand } from "@/lib/brand";

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

export type CartTabId = Brand<string, "CartTabId">;

export type CartTab = Cart & {
  id: CartTabId;
  number: number;
  name: string;
};

export const CART_TAB_NAME_MAX_LENGTH = 60;

type OrganizationCarts = {
  tabs: CartTab[];
  activeTabId: CartTabId;
};

type CartState = {
  cartsByOrganization: Partial<Record<OrganizationId, OrganizationCarts>>;
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
  addCartTab: (organizationId: OrganizationId, name: string) => void;
  renameCartTab: (
    organizationId: OrganizationId,
    tabId: CartTabId,
    name: string,
  ) => void;
  selectCartTab: (organizationId: OrganizationId, tabId: CartTabId) => void;
  finishCartTab: (organizationId: OrganizationId, tabId: CartTabId) => void;
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

const CART_STORE_VERSION = 3;
const FIRST_TAB_NUMBER = 1;

function createCartTabId(): CartTabId {
  return crypto.randomUUID() as CartTabId;
}

function normalizeTabName(name: string) {
  return name.trim().slice(0, CART_TAB_NAME_MAX_LENGTH);
}

function createCartTab(number: number, name = ""): CartTab {
  return {
    ...EMPTY_CART,
    id: createCartTabId(),
    number,
    name: normalizeTabName(name),
  };
}

export function getCartTabLabel(tab: Pick<CartTab, "name" | "number">) {
  return tab.name || `Pedido ${tab.number}`;
}

function createOrganizationCarts(): OrganizationCarts {
  const tab = createCartTab(FIRST_TAB_NUMBER);
  return { tabs: [tab], activeTabId: tab.id };
}

function getActiveTab(carts: OrganizationCarts): CartTab | undefined {
  return carts.tabs.find((tab) => tab.id === carts.activeTabId);
}

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

function removeTab(
  carts: OrganizationCarts,
  tabId: CartTabId,
): OrganizationCarts {
  const tabIndex = carts.tabs.findIndex((tab) => tab.id === tabId);
  if (tabIndex < 0) return carts;
  if (carts.tabs.length === 1) return createOrganizationCarts();

  const tabs = carts.tabs.filter((tab) => tab.id !== tabId);
  const activeTabId =
    carts.activeTabId === tabId
      ? (tabs[Math.min(tabIndex, tabs.length - 1)]?.id ?? tabs[0].id)
      : carts.activeTabId;

  return { tabs, activeTabId };
}

type LegacyCart = Partial<Cart> & Partial<OrganizationCarts>;

function migrateOrganizationCarts(cart: LegacyCart): OrganizationCarts {
  if (cart.tabs && cart.activeTabId) {
    return {
      tabs: cart.tabs.map((tab) => ({ ...tab, name: tab.name ?? "" })),
      activeTabId: cart.activeTabId,
    };
  }

  const tab: CartTab = {
    id: createCartTabId(),
    number: FIRST_TAB_NUMBER,
    name: "",
    note: cart.note ?? "",
    items: (cart.items ?? []).map((item) => ({
      ...item,
      note: item.note ?? "",
    })),
  };
  return { tabs: [tab], activeTabId: tab.id };
}

function migrateCartState(persistedState: unknown): PersistedCartState {
  const state = persistedState as {
    cartsByOrganization?: Record<string, LegacyCart | undefined>;
    tabTargetsByOrganization?: PersistedCartState["tabTargetsByOrganization"];
  };
  const cartsByOrganization = Object.fromEntries(
    Object.entries(state.cartsByOrganization ?? {}).flatMap(
      ([organizationId, cart]) =>
        cart ? [[organizationId, migrateOrganizationCarts(cart)]] : [],
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
      function updateCarts(
        organizationId: OrganizationId,
        updater: (carts: OrganizationCarts) => OrganizationCarts,
      ) {
        set((state) => ({
          cartsByOrganization: {
            ...state.cartsByOrganization,
            [organizationId]: updater(
              state.cartsByOrganization[organizationId] ??
                createOrganizationCarts(),
            ),
          },
        }));
      }

      function updateActiveCart(
        organizationId: OrganizationId,
        updater: (cart: CartTab) => CartTab,
      ) {
        updateCarts(organizationId, (carts) => ({
          ...carts,
          tabs: carts.tabs.map((tab) =>
            tab.id === carts.activeTabId ? updater(tab) : tab,
          ),
        }));
      }

      return {
        cartsByOrganization: {},
        tabTargetsByOrganization: {},
        addProduct: (organizationId, productId) =>
          updateActiveCart(organizationId, (cart) => ({
            ...cart,
            items: addToItems(cart.items, productId),
          })),
        decrementItem: (organizationId, productId, note) =>
          updateActiveCart(organizationId, (cart) => ({
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
          updateActiveCart(organizationId, (cart) => ({
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
          updateActiveCart(organizationId, (cart) => ({ ...cart, note })),
        addCartTab: (organizationId, name) =>
          updateCarts(organizationId, (carts) => {
            const [onlyTab] = carts.tabs;
            if (
              carts.tabs.length === 1 &&
              onlyTab &&
              onlyTab.items.length === 0 &&
              onlyTab.name === ""
            ) {
              return {
                tabs: [{ ...onlyTab, name: normalizeTabName(name) }],
                activeTabId: onlyTab.id,
              };
            }
            const nextNumber =
              Math.max(...carts.tabs.map((tab) => tab.number)) + 1;
            const tab = createCartTab(nextNumber, name);
            return { tabs: [...carts.tabs, tab], activeTabId: tab.id };
          }),
        renameCartTab: (organizationId, tabId, name) =>
          updateCarts(organizationId, (carts) => ({
            ...carts,
            tabs: carts.tabs.map((tab) =>
              tab.id === tabId ? { ...tab, name: normalizeTabName(name) } : tab,
            ),
          })),
        selectCartTab: (organizationId, tabId) =>
          updateCarts(organizationId, (carts) =>
            carts.tabs.some((tab) => tab.id === tabId)
              ? { ...carts, activeTabId: tabId }
              : carts,
          ),
        finishCartTab: (organizationId, tabId) =>
          updateCarts(organizationId, (carts) => removeTab(carts, tabId)),
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

const EMPTY_TABS: readonly CartTab[] = [];

export function useCartTabs(organizationId: OrganizationId) {
  const carts = useCartStore(
    (state) => state.cartsByOrganization[organizationId],
  );
  return {
    tabs: carts?.tabs ?? EMPTY_TABS,
    activeTabId: carts?.activeTabId ?? null,
  };
}

export function useActiveCartTabId(
  organizationId: OrganizationId,
): CartTabId | null {
  return useCartStore(
    (state) => state.cartsByOrganization[organizationId]?.activeTabId ?? null,
  );
}

export function useActiveCartTab(
  organizationId: OrganizationId,
): CartTab | null {
  return useCartStore((state) => {
    const carts = state.cartsByOrganization[organizationId];
    return (carts && getActiveTab(carts)) ?? null;
  });
}

export function useCart(organizationId: OrganizationId): Cart {
  return useCartStore((state) => {
    const carts = state.cartsByOrganization[organizationId];
    return (carts && getActiveTab(carts)) ?? EMPTY_CART;
  });
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
