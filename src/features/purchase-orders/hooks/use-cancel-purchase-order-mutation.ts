import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { cancelPurchaseOrder } from "../actions";
import type { PurchaseOrderId } from "../types";
import { getPendingPurchaseOrdersQueryKey } from "./use-pending-purchase-orders-query";

export function getCancelPurchaseOrderMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "purchase-orders",
    "cancel",
  ] as const;
}

export function useCancelPurchaseOrderMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getCancelPurchaseOrderMutationKey(organizationId),
    mutationFn: async (orderId: PurchaseOrderId) =>
      unwrapActionResult(await cancelPurchaseOrder(orderId)),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getPendingPurchaseOrdersQueryKey(organizationId),
      }),
  });
}
