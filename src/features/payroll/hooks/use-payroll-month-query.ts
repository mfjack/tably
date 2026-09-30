import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { getPayrollMonth } from "../actions";

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
      unwrapActionResult(await getPayrollMonth(organizationId, monthKey)),
  });
}
