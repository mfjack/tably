import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { withNetworkTimeout } from "@/lib/network-error";
import type { OrderItemInput, OrderRequestInput } from "../schemas";
import { addOrderItems } from "../tab-actions";
import type { OrderId } from "../types";
import { useInvalidateOrders } from "./use-invalidate-orders";

type AddOrderItemsVariables = {
  orderId: OrderId;
  items: OrderItemInput[];
  note?: string;
  request: OrderRequestInput;
};

export function getAddOrderItemsMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "add-items"] as const;
}

export function useAddOrderItemsMutation(organizationId: OrganizationId) {
  const invalidateOrders = useInvalidateOrders(organizationId);

  return useMutation({
    mutationKey: getAddOrderItemsMutationKey(organizationId),
    mutationFn: async ({
      orderId,
      items,
      note,
      request,
    }: AddOrderItemsVariables) =>
      unwrapActionResult(
        await withNetworkTimeout(addOrderItems(orderId, items, note, request)),
      ),
    networkMode: "always",
    onSuccess: invalidateOrders,
  });
}
