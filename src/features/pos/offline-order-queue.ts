import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  OrderItemInput,
  OrderPaymentInput,
  OrderRequestInput,
  PlaceOrderInput,
} from "@/features/orders/schemas";
import type { OrderId } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import type { Brand } from "@/lib/brand";

export type OrderRequestId = Brand<string, "OrderRequestId">;

export type QueuedOrderSyncState =
  | { status: "pending" }
  | { status: "failed"; errorMessage: string };

type QueuedOrderBase = {
  requestId: OrderRequestId;
  organizationId: OrganizationId;
  placedAt: string;
  customerName: string | null;
  total: number;
  syncState: QueuedOrderSyncState;
};

export type QueuedPlaceOrder = QueuedOrderBase & {
  kind: "place-order";
  input: PlaceOrderInput;
};

export type QueuedTabItems = QueuedOrderBase & {
  kind: "add-items";
  orderId: OrderId;
  items: OrderItemInput[];
  note: string;
};

export type QueuedOrder = QueuedPlaceOrder | QueuedTabItems;

export type NewQueuedOrder =
  | Omit<QueuedPlaceOrder, "syncState">
  | Omit<QueuedTabItems, "syncState">;

type OfflineOrderQueueState = {
  queuedOrders: QueuedOrder[];
  enqueueOrder: (queuedOrder: NewQueuedOrder) => void;
  removeOrder: (requestId: OrderRequestId) => void;
  markOrderFailed: (requestId: OrderRequestId, errorMessage: string) => void;
  retryOrder: (requestId: OrderRequestId) => void;
};

const QUEUE_STORE_VERSION = 1;

type LegacyPlaceOrderInput = PlaceOrderInput & { payment?: OrderPaymentInput };

function migrateQueuedOrder(queuedOrder: QueuedOrder): QueuedOrder {
  if (queuedOrder.kind !== "place-order") return queuedOrder;

  const { payment, ...input }: LegacyPlaceOrderInput = queuedOrder.input;
  if (!payment) return queuedOrder;

  return { ...queuedOrder, input: { ...input, payments: [payment] } };
}

function migrateQueueState(persistedState: unknown) {
  const state = persistedState as { queuedOrders?: QueuedOrder[] };
  return { queuedOrders: (state.queuedOrders ?? []).map(migrateQueuedOrder) };
}

export function createOrderRequestId(): OrderRequestId {
  return crypto.randomUUID() as OrderRequestId;
}

export function toOrderRequest(queuedOrder: QueuedOrder): OrderRequestInput {
  return { requestId: queuedOrder.requestId, placedAt: queuedOrder.placedAt };
}

export const useOfflineOrderQueue = create<OfflineOrderQueueState>()(
  persist(
    (set) => {
      function updateSyncState(
        requestId: OrderRequestId,
        syncState: QueuedOrderSyncState,
      ) {
        set((state) => ({
          queuedOrders: state.queuedOrders.map((queuedOrder) =>
            queuedOrder.requestId === requestId
              ? { ...queuedOrder, syncState }
              : queuedOrder,
          ),
        }));
      }

      return {
        queuedOrders: [],
        enqueueOrder: (queuedOrder) =>
          set((state) => ({
            queuedOrders: state.queuedOrders.some(
              ({ requestId }) => requestId === queuedOrder.requestId,
            )
              ? state.queuedOrders
              : [
                  ...state.queuedOrders,
                  { ...queuedOrder, syncState: { status: "pending" } },
                ],
          })),
        removeOrder: (requestId) =>
          set((state) => ({
            queuedOrders: state.queuedOrders.filter(
              (queuedOrder) => queuedOrder.requestId !== requestId,
            ),
          })),
        markOrderFailed: (requestId, errorMessage) =>
          updateSyncState(requestId, { status: "failed", errorMessage }),
        retryOrder: (requestId) =>
          updateSyncState(requestId, { status: "pending" }),
      };
    },
    {
      name: "tably-offline-orders",
      version: QUEUE_STORE_VERSION,
      migrate: migrateQueueState,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ queuedOrders: state.queuedOrders }),
      skipHydration: true,
    },
  ),
);

export function getPendingQueuedOrders(): QueuedOrder[] {
  return useOfflineOrderQueue
    .getState()
    .queuedOrders.filter(
      (queuedOrder) => queuedOrder.syncState.status === "pending",
    );
}

function subscribeToHydration(onChange: () => void) {
  return useOfflineOrderQueue.persist.onFinishHydration(onChange);
}

function getIsHydrated() {
  return useOfflineOrderQueue.persist.hasHydrated();
}

function getIsHydratedOnServer() {
  return false;
}

export function useHydratedOfflineOrderQueue(): boolean {
  useEffect(() => {
    if (!useOfflineOrderQueue.persist.hasHydrated()) {
      void useOfflineOrderQueue.persist.rehydrate();
    }
  }, []);

  return useSyncExternalStore(
    subscribeToHydration,
    getIsHydrated,
    getIsHydratedOnServer,
  );
}
