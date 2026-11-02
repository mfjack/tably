import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OrderAdjustmentsInput } from "@/features/orders/order-adjustments";
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

export type QueuedOrderPreviewItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  addonNames: string[];
  note: string | null;
  total: number;
};

export type QueuedPlaceOrder = QueuedOrderBase & {
  kind: "place-order";
  input: PlaceOrderInput;
  previewItems?: QueuedOrderPreviewItem[];
};

export type QueuedTabItems = QueuedOrderBase & {
  kind: "add-items";
  orderId: OrderId;
  items: OrderItemInput[];
  note: string;
};

export type QueuedTabPayment = QueuedOrderBase & {
  kind: "pay-order";
  orderId: OrderId;
  payments: OrderPaymentInput[];
  adjustments: OrderAdjustmentsInput;
};

export type QueuedOrder = QueuedPlaceOrder | QueuedTabItems | QueuedTabPayment;

export type NewQueuedOrder =
  | Omit<QueuedPlaceOrder, "syncState">
  | Omit<QueuedTabItems, "syncState">
  | Omit<QueuedTabPayment, "syncState">;

type OfflineOrderQueueState = {
  queuedOrders: QueuedOrder[];
  syncedOrderIds: Record<string, OrderId>;
  enqueueOrder: (queuedOrder: NewQueuedOrder) => void;
  removeOrder: (requestId: OrderRequestId) => void;
  markOrderFailed: (requestId: OrderRequestId, errorMessage: string) => void;
  retryOrder: (requestId: OrderRequestId) => void;
  appendQueuedTabItems: (
    requestId: OrderRequestId,
    items: OrderItemInput[],
    previewItems: QueuedOrderPreviewItem[],
    addedTotal: number,
    note: string,
  ) => void;
  recordSyncedOrder: (requestId: OrderRequestId, orderId: OrderId) => void;
  chargeQueuedTab: (
    requestId: OrderRequestId,
    payments: OrderPaymentInput[],
    adjustments: OrderAdjustmentsInput,
    total: number,
  ) => void;
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
  const state = persistedState as {
    queuedOrders?: QueuedOrder[];
    syncedOrderIds?: Record<string, OrderId>;
  };
  return {
    queuedOrders: (state.queuedOrders ?? []).map(migrateQueuedOrder),
    syncedOrderIds: state.syncedOrderIds ?? {},
  };
}

function joinNotes(...notes: (string | undefined)[]) {
  const joinedNote = notes
    .map((note) => note?.trim())
    .filter(Boolean)
    .join(" · ");
  return joinedNote || undefined;
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
        syncedOrderIds: {},
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
        appendQueuedTabItems: (
          requestId,
          items,
          previewItems,
          addedTotal,
          note,
        ) =>
          set((state) => ({
            queuedOrders: state.queuedOrders.map((queuedOrder) =>
              queuedOrder.requestId === requestId &&
              queuedOrder.kind === "place-order"
                ? {
                    ...queuedOrder,
                    total: queuedOrder.total + addedTotal,
                    input: {
                      ...queuedOrder.input,
                      items: [...queuedOrder.input.items, ...items],
                      note: joinNotes(queuedOrder.input.note, note),
                    },
                    previewItems: [
                      ...(queuedOrder.previewItems ?? []),
                      ...previewItems,
                    ],
                  }
                : queuedOrder,
            ),
          })),
        recordSyncedOrder: (requestId, orderId) =>
          set((state) => ({
            syncedOrderIds: { ...state.syncedOrderIds, [requestId]: orderId },
          })),
        chargeQueuedTab: (requestId, payments, adjustments, total) =>
          set((state) => ({
            queuedOrders: state.queuedOrders.map((queuedOrder) =>
              queuedOrder.requestId === requestId &&
              queuedOrder.kind === "place-order"
                ? {
                    ...queuedOrder,
                    total,
                    input: { ...queuedOrder.input, payments, adjustments },
                  }
                : queuedOrder,
            ),
          })),
      };
    },
    {
      name: "tably-offline-orders",
      version: QUEUE_STORE_VERSION,
      migrate: migrateQueueState,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        queuedOrders: state.queuedOrders,
        syncedOrderIds: state.syncedOrderIds,
      }),
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
