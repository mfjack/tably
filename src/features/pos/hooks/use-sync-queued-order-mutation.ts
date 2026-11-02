import { useMutation } from "@tanstack/react-query";
import { placeOrder } from "@/features/orders/actions";
import { TAB_ALREADY_CLOSED_MESSAGE } from "@/features/orders/messages";
import { addOrderItems, payOrder } from "@/features/orders/tab-actions";
import { type ActionResult, actionSuccess } from "@/lib/action-result";
import { withNetworkTimeout } from "@/lib/network-error";
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

  if (queuedOrder.kind === "pay-order") {
    const result = await payOrder(
      queuedOrder.orderId,
      queuedOrder.payments,
      queuedOrder.adjustments,
    );
    return result.status === "error" &&
      result.message === TAB_ALREADY_CLOSED_MESSAGE
      ? actionSuccess()
      : result;
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
    mutationFn: (queuedOrder: QueuedOrder) =>
      withNetworkTimeout(sendQueuedOrder(queuedOrder)),
    networkMode: "always",
    retry: false,
  });
}
