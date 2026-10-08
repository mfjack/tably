import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { applyStockCount } from "../actions";
import type { StockCountFormInput } from "../schemas";

export function getApplyStockCountMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "stock-counts", "apply"] as const;
}

export function useApplyStockCountMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getApplyStockCountMutationKey(organizationId),
    mutationFn: async (values: StockCountFormInput) =>
      unwrapActionResult(await applyStockCount(organizationId, values)),
    onSuccess: invalidateCatalog,
  });
}
