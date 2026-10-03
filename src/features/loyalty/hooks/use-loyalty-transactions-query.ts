import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listLoyaltyTransactions } from "../actions";
import type { LoyaltyCustomerId } from "../types";
import { getLoyaltyCustomersQueryKey } from "./use-loyalty-customers-query";

export function getLoyaltyTransactionsQueryKey(
  organizationId: OrganizationId,
  customerId: LoyaltyCustomerId | null,
) {
  return [
    ...getLoyaltyCustomersQueryKey(organizationId),
    "transactions",
    customerId,
  ] as const;
}

export function useLoyaltyTransactionsQuery(
  organizationId: OrganizationId,
  customerId: LoyaltyCustomerId | null,
) {
  return useQuery({
    queryKey: getLoyaltyTransactionsQueryKey(organizationId, customerId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listLoyaltyTransactions>>(
        organizationApiPath(
          organizationId,
          `loyalty/customers/${customerId}/transactions`,
        ),
      ),
    enabled: customerId !== null,
  });
}
