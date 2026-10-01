import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getPayrollMonth } from "../actions";

export function getPayrollMonthQueryKey(
  organizationId: OrganizationId,
  monthKey: string,
) {
  return [
    "organizations",
    organizationId,
    "payroll",
    "months",
    monthKey,
  ] as const;
}

export function usePayrollMonthQuery(
  organizationId: OrganizationId,
  monthKey: string,
) {
  return useQuery({
    queryKey: getPayrollMonthQueryKey(organizationId, monthKey),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getPayrollMonth>>(
        organizationApiPath(organizationId, `payroll/months/${monthKey}`),
      ),
  });
}
