import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { getSalesReport } from "../actions";
import type { SalesReportPeriod } from "../types";

export function getSalesReportQueryKey(
  organizationId: OrganizationId,
  period: SalesReportPeriod,
) {
  return ["organizations", organizationId, "sales-report", period] as const;
}

export function useSalesReportQuery(
  organizationId: OrganizationId,
  period: SalesReportPeriod,
) {
  return useQuery({
    queryKey: getSalesReportQueryKey(organizationId, period),
    queryFn: async () =>
      unwrapActionResult(await getSalesReport(organizationId, period)),
    placeholderData: keepPreviousData,
  });
}
