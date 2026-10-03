import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getOpeningBalance } from "../opening-balance-actions";

export function getOpeningBalanceQueryKey(organizationId: OrganizationId) {
  return [
    "organizations",
    organizationId,
    "finance",
    "opening-balance",
  ] as const;
}

export function useOpeningBalanceQuery(
  organizationId: OrganizationId,
  isEnabled: boolean,
) {
  return useQuery({
    queryKey: getOpeningBalanceQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getOpeningBalance>>(
        organizationApiPath(organizationId, "finance/opening-balance"),
      ),
    enabled: isEnabled,
  });
}
