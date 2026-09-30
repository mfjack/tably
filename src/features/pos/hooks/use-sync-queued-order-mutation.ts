import { useMutation } from "@tanstack/react-query";
import { placeOrder } from "@/features/orders/actions";
import { addOrderItems } from "@/features/orders/tab-actions";
import type { ActionResult } from "@/lib/action-result";
import { type QueuedOrder, toOrderRequest } from "../offline-order-queue";

export function getSyncQueuedOrderMutationKey() {
  return ["pos", "offline-orders", "sync"] as const;
}

async function sendQueuedOrder(
  queuedOrder: QueuedOrder,
): Promise<ActionResult<unknown>> {
  const request = toOrderRequest(queuedOrder);

  if (queuedOrder.kind === "place-order") {
    return placeOrder(queuedOrder.organizationId, queuedOrder.input, request);
  }

  return addOrderItems(
    queuedOrder.orderId,
    queuedOrder.items,
    queuedOrder.note,
    request,
  );
}

export function useSyncQueuedOrderMutation() {
  return useMutation({
    mutationKey: getSyncQueuedOrderMutationKey(),
    mutationFn: sendQueuedOrder,
    networkMode: "always",
    retry: false,
  });
}
