import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listCustomerAccounts } from "../actions";

export function getCustomerAccountsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "customer-accounts"] as const;
}

export function useCustomerAccountsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getCustomerAccountsQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listCustomerAccounts(organizationId)),
  });
}
