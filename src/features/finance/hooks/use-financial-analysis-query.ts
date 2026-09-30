import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { getFinancialAnalysis } from "../actions";
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
      unwrapActionResult(
        await getFinancialAnalysis(organizationId, monthKey, horizonDays),
      ),
  });
}
