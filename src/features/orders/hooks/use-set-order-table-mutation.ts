import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { setOrderTable } from "../tab-actions";
import type { OrderId } from "../types";
import { useInvalidateOrders } from "./use-invalidate-orders";

type SetOrderTableVariables = {
  orderId: OrderId;
  tableNumber: number;
};

export function getSetOrderTableMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "set-table"] as const;
}

export function useSetOrderTableMutation(organizationId: OrganizationId) {
  const invalidateOrders = useInvalidateOrders(organizationId);

  return useMutation({
    mutationKey: getSetOrderTableMutationKey(organizationId),
    mutationFn: async ({ orderId, tableNumber }: SetOrderTableVariables) =>
      unwrapActionResult(await setOrderTable(orderId, tableNumber)),
    onSuccess: invalidateOrders,
  });
}
