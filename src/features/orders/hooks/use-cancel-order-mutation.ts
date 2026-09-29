import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { cancelOrder } from "../tab-actions";
import type { OrderId } from "../types";
import { useInvalidateOrders } from "./use-invalidate-orders";

export function getCancelOrderMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "cancel"] as const;
}

export function useCancelOrderMutation(organizationId: OrganizationId) {
  const invalidateOrders = useInvalidateOrders(organizationId);

  return useMutation({
    mutationKey: getCancelOrderMutationKey(organizationId),
    mutationFn: async (orderId: OrderId) =>
      unwrapActionResult(await cancelOrder(orderId)),
    onSuccess: invalidateOrders,
  });
}
