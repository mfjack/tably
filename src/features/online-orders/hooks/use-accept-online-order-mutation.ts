import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useInvalidateOrders } from "@/features/orders/hooks/use-invalidate-orders";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { acceptOnlineOrder } from "../actions";
import type { OnlineOrderId } from "../types";
import { getPendingOnlineOrdersQueryKey } from "./use-pending-online-orders-query";

export function getAcceptOnlineOrderMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "online-orders", "accept"] as const;
}

export function useAcceptOnlineOrderMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();
  const invalidateOrders = useInvalidateOrders(organizationId);

  return useMutation({
    mutationKey: getAcceptOnlineOrderMutationKey(organizationId),
    mutationFn: async (onlineOrderId: OnlineOrderId) =>
      unwrapActionResult(await acceptOnlineOrder(onlineOrderId)),
    networkMode: "online",
    onSettled: () => {
      invalidateOrders();
      void queryClient.invalidateQueries({
        queryKey: getPendingOnlineOrdersQueryKey(organizationId),
      });
    },
  });
}
