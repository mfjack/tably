import { useQuery } from "@tanstack/react-query";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { getTimesheet } from "../actions";

export function getTimesheetQueryKey(
  organizationId: OrganizationId,
  employeeId: EmployeeId,
  monthKey: string,
) {
  return [
    "organizations",
    organizationId,
    "timesheets",
    employeeId,
    monthKey,
  ] as const;
}

export function useTimesheetQuery(
  organizationId: OrganizationId,
  employeeId: EmployeeId,
  monthKey: string,
) {
  return useQuery({
    queryKey: getTimesheetQueryKey(organizationId, employeeId, monthKey),
    queryFn: async () =>
      unwrapActionResult(
        await getTimesheet(organizationId, employeeId, monthKey),
      ),
  });
}
