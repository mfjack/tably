import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listFinancialAccounts } from "../actions";

export function getFinancialAccountsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "finance", "accounts"] as const;
}

export function useFinancialAccountsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getFinancialAccountsQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listFinancialAccounts(organizationId)),
  });
}
