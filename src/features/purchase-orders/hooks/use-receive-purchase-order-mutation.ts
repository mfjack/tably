import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import { useInvalidateFinance } from "@/features/finance/hooks/use-invalidate-finance";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateSuppliers } from "@/features/suppliers/hooks/use-invalidate-suppliers";
import { unwrapActionResult } from "@/lib/action-result";
import { receivePurchaseOrder } from "../actions";
import type { ReceivePurchaseOrderInput } from "../schemas";
import type { PurchaseOrderId } from "../types";
import { getPendingPurchaseOrdersQueryKey } from "./use-pending-purchase-orders-query";

export type ReceivePurchaseOrderVariables = {
  orderId: PurchaseOrderId;
  input: ReceivePurchaseOrderInput;
};

export function getReceivePurchaseOrderMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "purchase-orders",
    "receive",
  ] as const;
}

export function useReceivePurchaseOrderMutation(
  organizationId: OrganizationId,
) {
  const queryClient = useQueryClient();
  const invalidateCatalog = useInvalidateCatalog(organizationId);
  const invalidateSuppliers = useInvalidateSuppliers(organizationId);
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getReceivePurchaseOrderMutationKey(organizationId),
    mutationFn: async ({ orderId, input }: ReceivePurchaseOrderVariables) =>
      unwrapActionResult(await receivePurchaseOrder(orderId, input)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: getPendingPurchaseOrdersQueryKey(organizationId),
        }),
        invalidateCatalog(),
        invalidateSuppliers(),
        invalidateFinance(),
      ]),
  });
}
