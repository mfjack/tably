import { useQuery } from "@tanstack/react-query";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getTimesheet } from "../actions";

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
      fetchActionResult<ActionData<typeof getTimesheet>>(
        organizationApiPath(
          organizationId,
          `time-clock/timesheets/${employeeId}`,
          { month: monthKey },
        ),
      ),
  });
}
