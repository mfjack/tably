import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { registerStockLoss } from "../actions";
import type { StockLossFormInput } from "../schemas";
import { getStockLossesQueryKey } from "./use-stock-losses-query";

export function getRegisterStockLossMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "stock-losses", "register"] as const;
}

export function useRegisterStockLossMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getRegisterStockLossMutationKey(organizationId),
    mutationFn: async (values: StockLossFormInput) =>
      unwrapActionResult(await registerStockLoss(organizationId, values)),
    onSuccess: () =>
      Promise.all([
        invalidateCatalog(),
        queryClient.invalidateQueries({
          queryKey: getStockLossesQueryKey(organizationId),
        }),
      ]),
  });
}
