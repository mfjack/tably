import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { getStockLossesQueryKey } from "./use-stock-losses-query";

export function useInvalidateStockLosses(organizationId: OrganizationId) {
  const queryClient = useQueryClient();
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useCallback(
    () =>
      Promise.all([
        invalidateCatalog(),
        queryClient.invalidateQueries({
          queryKey: getStockLossesQueryKey(organizationId),
        }),
      ]),
    [invalidateCatalog, queryClient, organizationId],
  );
}
