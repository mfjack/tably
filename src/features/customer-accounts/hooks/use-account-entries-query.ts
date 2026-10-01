import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listAccountEntries } from "../actions";
import type { CustomerAccountId } from "../types";

export function getAccountEntriesQueryKey(
  organizationId: OrganizationId,
  accountId: CustomerAccountId | null,
) {
  return [
    "organizations",
    organizationId,
    "customer-accounts",
    accountId,
    "entries",
  ] as const;
}

export function useAccountEntriesQuery(
  organizationId: OrganizationId,
  accountId: CustomerAccountId | null,
) {
  return useQuery({
    queryKey: getAccountEntriesQueryKey(organizationId, accountId),
    queryFn: async () =>
      accountId
        ? fetchActionResult<ActionData<typeof listAccountEntries>>(
            organizationApiPath(
              organizationId,
              `customer-accounts/${accountId}/entries`,
            ),
          )
        : [],
    enabled: accountId !== null,
  });
}
