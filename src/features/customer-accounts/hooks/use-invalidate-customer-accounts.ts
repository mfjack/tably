import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { getCustomerAccountsQueryKey } from "./use-customer-accounts-query";

export function useInvalidateCustomerAccounts(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getCustomerAccountsQueryKey(organizationId),
      }),
    [queryClient, organizationId],
  );
}
