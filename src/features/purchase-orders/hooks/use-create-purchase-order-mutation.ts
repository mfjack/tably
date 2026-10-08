import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { createPurchaseOrder } from "../actions";
import type { CreatePurchaseOrderInput } from "../schemas";
import { getPendingPurchaseOrdersQueryKey } from "./use-pending-purchase-orders-query";

export function getCreatePurchaseOrderMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "purchase-orders",
    "create",
  ] as const;
}

export function useCreatePurchaseOrderMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getCreatePurchaseOrderMutationKey(organizationId),
    mutationFn: async (input: CreatePurchaseOrderInput) =>
      unwrapActionResult(await createPurchaseOrder(organizationId, input)),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getPendingPurchaseOrdersQueryKey(organizationId),
      }),
  });
}
