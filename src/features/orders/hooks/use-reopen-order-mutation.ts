import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { reopenOrder } from "../tab-actions";
import type { OrderId } from "../types";
import { useInvalidateOrders } from "./use-invalidate-orders";

type ReopenOrderVariables = {
  orderId: OrderId;
  pin: string | null;
};

export function getReopenOrderMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "reopen"] as const;
}

export function useReopenOrderMutation(organizationId: OrganizationId) {
  const invalidateOrders = useInvalidateOrders(organizationId);

  return useMutation({
    mutationKey: getReopenOrderMutationKey(organizationId),
    mutationFn: async ({ orderId, pin }: ReopenOrderVariables) =>
      unwrapActionResult(await reopenOrder(orderId, pin)),
    onSuccess: invalidateOrders,
  });
}
