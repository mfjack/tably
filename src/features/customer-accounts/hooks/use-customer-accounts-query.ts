import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listCustomerAccounts } from "../actions";

export function getCustomerAccountsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "customer-accounts"] as const;
}

export function useCustomerAccountsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getCustomerAccountsQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listCustomerAccounts>>(
        organizationApiPath(organizationId, "customer-accounts"),
      ),
  });
}
