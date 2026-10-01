import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { rejectOnlineOrder } from "../actions";
import type { OnlineOrderId } from "../types";
import { getPendingOnlineOrdersQueryKey } from "./use-pending-online-orders-query";

export function getRejectOnlineOrderMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "online-orders", "reject"] as const;
}

export function useRejectOnlineOrderMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getRejectOnlineOrderMutationKey(organizationId),
    mutationFn: async (onlineOrderId: OnlineOrderId) =>
      unwrapActionResult(await rejectOnlineOrder(onlineOrderId)),
    networkMode: "online",
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: getPendingOnlineOrdersQueryKey(organizationId),
      }),
  });
}
