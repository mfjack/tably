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

export function getOnlineOrderStatusQueryKey(onlineOrderId: string) {
  return ["online-orders", onlineOrderId, "status"] as const;
}

export function useOnlineOrderStatusQuery(
  onlineOrderId: string,
  initialOrder: PublicOnlineOrder,
) {
  return useQuery({
    queryKey: getOnlineOrderStatusQueryKey(onlineOrderId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getOnlineOrderStatus>>(
        `/api/public/online-orders/${onlineOrderId}`,
      ),
    initialData: initialOrder,
    refetchInterval: (query) =>
      query.state.data && isFinalStage(query.state.data.stage)
        ? false
        : STATUS_REFRESH_INTERVAL_IN_MILLISECONDS,
  });
}
