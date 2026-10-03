import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listLoyaltyCustomers } from "../actions";

export function getLoyaltyCustomersQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "loyalty-customers"] as const;
}

export function useLoyaltyCustomersQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getLoyaltyCustomersQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listLoyaltyCustomers>>(
        organizationApiPath(organizationId, "loyalty/customers"),
      ),
    staleTime: 0,
  });
}
