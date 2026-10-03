import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { findLoyaltyCustomer } from "../actions";
import { LOYALTY_PHONE_PATTERN } from "../schemas";
import { getLoyaltyCustomersQueryKey } from "./use-loyalty-customers-query";

export function getLoyaltyCustomerLookupQueryKey(
  organizationId: OrganizationId,
  phone: string,
) {
  return [
    ...getLoyaltyCustomersQueryKey(organizationId),
    "lookup",
    phone,
  ] as const;
}

export function useLoyaltyCustomerLookupQuery(
  organizationId: OrganizationId,
  phone: string,
) {
  return useQuery({
    queryKey: getLoyaltyCustomerLookupQueryKey(organizationId, phone),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof findLoyaltyCustomer>>(
        organizationApiPath(organizationId, "loyalty/lookup", { phone }),
      ),
    enabled: LOYALTY_PHONE_PATTERN.test(phone),
    staleTime: 0,
  });
}
