import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { isNetworkError } from "@/lib/network-error";
import {
  getPendingQueuedOrders,
  type QueuedOrder,
  useHydratedOfflineOrderQueue,
  useOfflineOrderQueue,
} from "../offline-order-queue";
import { useSyncQueuedOrderMutation } from "./use-sync-queued-order-mutation";

const SYNC_INTERVAL_IN_MS = 30 * 1000;
const UNEXPECTED_SYNC_ERROR_MESSAGE = "Não foi possível enviar a venda.";

function countPendingOrders(state: { queuedOrders: QueuedOrder[] }) {
  return state.queuedOrders.filter(
    (queuedOrder) => queuedOrder.syncState.status === "pending",
  ).length;
}

export function useOfflineOrderSync() {
  const queryClient = useQueryClient();
  const isQueueHydrated = useHydratedOfflineOrderQueue();
  const { mutateAsync: syncQueuedOrder } = useSyncQueuedOrderMutation();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!isQueueHydrated) return;

    async function syncPendingOrders() {
      if (isSyncingRef.current || !onlineManager.isOnline()) return;
      isSyncingRef.current = true;

      const { removeOrder, markOrderFailed } = useOfflineOrderQueue.getState();
      const syncedOrganizationIds = new Set<string>();

      for (const queuedOrder of getPendingQueuedOrders()) {
        try {
          const result = await syncQueuedOrder(queuedOrder);

          if (result.status === "success") {
            removeOrder(queuedOrder.requestId);
            syncedOrganizationIds.add(queuedOrder.organizationId);
          } else {
            markOrderFailed(queuedOrder.requestId, result.message);
          }
        } catch (error) {
          if (isNetworkError(error)) break;
          markOrderFailed(queuedOrder.requestId, UNEXPECTED_SYNC_ERROR_MESSAGE);
        }
      }

      isSyncingRef.current = false;
      await Promise.all(
        [...syncedOrganizationIds].map((organizationId) =>
          queryClient.invalidateQueries({
            queryKey: ["organizations", organizationId],
          }),
        ),
      );
    }

    void syncPendingOrders();

    const unsubscribeFromOnline = onlineManager.subscribe((isOnline) => {
      if (isOnline) void syncPendingOrders();
    });
    const unsubscribeFromQueue = useOfflineOrderQueue.subscribe(
      (state, previousState) => {
        if (countPendingOrders(state) > countPendingOrders(previousState)) {
          void syncPendingOrders();
        }
      },
    );
    const syncInterval = window.setInterval(
      () => void syncPendingOrders(),
      SYNC_INTERVAL_IN_MS,
    );

    return () => {
      unsubscribeFromOnline();
      unsubscribeFromQueue();
      window.clearInterval(syncInterval);
    };
  }, [isQueueHydrated, queryClient, syncQueuedOrder]);
}
