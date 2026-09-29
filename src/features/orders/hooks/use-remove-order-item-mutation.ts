import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { removeOrderItem } from "../tab-actions";
import type { OrderItemId } from "../types";
import { useInvalidateOrders } from "./use-invalidate-orders";

export function getRemoveOrderItemMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "remove-item"] as const;
}

export function useRemoveOrderItemMutation(organizationId: OrganizationId) {
  const invalidateOrders = useInvalidateOrders(organizationId);

  return useMutation({
    mutationKey: getRemoveOrderItemMutationKey(organizationId),
    mutationFn: async (orderItemId: OrderItemId) =>
      unwrapActionResult(await removeOrderItem(orderItemId)),
    onSuccess: invalidateOrders,
  });
}
