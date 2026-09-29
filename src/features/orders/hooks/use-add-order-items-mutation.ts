import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import type { OrderItemInput } from "../schemas";
import { addOrderItems } from "../tab-actions";
import type { OrderId } from "../types";
import { useInvalidateOrders } from "./use-invalidate-orders";

type AddOrderItemsVariables = {
  orderId: OrderId;
  items: OrderItemInput[];
  note?: string;
};

export function getAddOrderItemsMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "add-items"] as const;
}

export function useAddOrderItemsMutation(organizationId: OrganizationId) {
  const invalidateOrders = useInvalidateOrders(organizationId);

  return useMutation({
    mutationKey: getAddOrderItemsMutationKey(organizationId),
    mutationFn: async ({ orderId, items, note }: AddOrderItemsVariables) =>
      unwrapActionResult(await addOrderItems(orderId, items, note)),
    onSuccess: invalidateOrders,
  });
}
