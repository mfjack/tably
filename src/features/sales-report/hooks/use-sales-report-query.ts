import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getSalesReport } from "../actions";
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
      fetchActionResult<ActionData<typeof getSalesReport>>(
        organizationApiPath(organizationId, "sales-report", { period }),
      ),
    placeholderData: keepPreviousData,
  });
}
