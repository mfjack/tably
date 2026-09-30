import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { getFinancialOverview } from "../actions";

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
      unwrapActionResult(await getFinancialOverview(organizationId, monthKey)),
  });
}
