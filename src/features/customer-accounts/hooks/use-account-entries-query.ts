import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listAccountEntries } from "../actions";
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
      accountId ? unwrapActionResult(await listAccountEntries(accountId)) : [],
    enabled: accountId !== null,
  });
}
