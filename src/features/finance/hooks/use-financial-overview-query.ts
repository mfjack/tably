import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getFinancialOverview } from "../actions";

export function getFinancialOverviewQueryKey(
  organizationId: OrganizationId,
  monthKey: string,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "overview",
    monthKey,
  ] as const;
}

export function useFinancialOverviewQuery(
  organizationId: OrganizationId,
  monthKey: string,
) {
  return useQuery({
    queryKey: getFinancialOverviewQueryKey(organizationId, monthKey),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getFinancialOverview>>(
        organizationApiPath(organizationId, "finance/overview", {
          month: monthKey,
        }),
      ),
  });
}
