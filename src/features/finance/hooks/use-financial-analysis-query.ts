import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getFinancialAnalysis } from "../actions";
import type { ProjectionHorizon } from "../analysis";

export function getFinancialAnalysisQueryKey(
  organizationId: OrganizationId,
  monthKey: string,
  horizonDays: ProjectionHorizon,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "analysis",
    monthKey,
    horizonDays,
  ] as const;
}

export function useFinancialAnalysisQuery(
  organizationId: OrganizationId,
  monthKey: string,
  horizonDays: ProjectionHorizon,
) {
  return useQuery({
    queryKey: getFinancialAnalysisQueryKey(
      organizationId,
      monthKey,
      horizonDays,
    ),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getFinancialAnalysis>>(
        organizationApiPath(organizationId, "finance/analysis", {
          month: monthKey,
          horizon: horizonDays,
        }),
      ),
  });
}
