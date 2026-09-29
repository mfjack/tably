import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { getSupplierSummariesQueryKey } from "./use-supplier-summaries-query";
import { getSuppliersQueryKey } from "./use-suppliers-query";

export function useInvalidateSuppliers(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      Promise.all(
        [
          getSuppliersQueryKey(organizationId),
          getSupplierSummariesQueryKey(organizationId),
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
    [queryClient, organizationId],
  );
}
