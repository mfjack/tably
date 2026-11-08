import { useQuery } from "@tanstack/react-query";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import type { getOnlineOrderStatus } from "../actions";
import {
  FINAL_ONLINE_ORDER_STAGES,
  type OnlineOrderStage,
  type PublicOnlineOrder,
} from "../types";

const STATUS_REFRESH_INTERVAL_IN_MILLISECONDS = 5_000;

function isFinalStage(stage: OnlineOrderStage) {
  return FINAL_ONLINE_ORDER_STAGES.some((finalStage) => finalStage === stage);
}

export function isOnlineOrderFinished(order: PublicOnlineOrder) {
  return order.isPaid || order.stage === "rejected";
}

export function getOnlineOrderStatusQueryKey(onlineOrderId: string) {
  return ["online-orders", onlineOrderId, "status"] as const;
}

function getStatusRefetchInterval(order: PublicOnlineOrder | undefined) {
  return order && (isFinalStage(order.stage) || isOnlineOrderFinished(order))
    ? false
    : STATUS_REFRESH_INTERVAL_IN_MILLISECONDS;
}

async function fetchOnlineOrderStatus(onlineOrderId: string) {
  return fetchActionResult<ActionData<typeof getOnlineOrderStatus>>(
    `/api/public/online-orders/${onlineOrderId}`,
  );
}

export function useOnlineOrderStatusQuery(
  onlineOrderId: string,
  initialOrder: PublicOnlineOrder,
) {
  return useQuery({
    queryKey: getOnlineOrderStatusQueryKey(onlineOrderId),
    queryFn: () => fetchOnlineOrderStatus(onlineOrderId),
    initialData: initialOrder,
    refetchInterval: (query) => getStatusRefetchInterval(query.state.data),
  });
}

export function useRecentOnlineOrderStatusQuery(onlineOrderId: string | null) {
  return useQuery({
    queryKey: getOnlineOrderStatusQueryKey(onlineOrderId ?? ""),
    queryFn: () => fetchOnlineOrderStatus(onlineOrderId ?? ""),
    enabled: onlineOrderId !== null,
    refetchInterval: (query) => getStatusRefetchInterval(query.state.data),
  });
}
