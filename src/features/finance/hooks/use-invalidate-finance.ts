import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";

export function getFinanceQueryKeyPrefix(organizationId: OrganizationId) {
  return ["organizations", organizationId, "finance"] as const;
}

export function useInvalidateFinance(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getFinanceQueryKeyPrefix(organizationId),
      }),
    [queryClient, organizationId],
  );
}
