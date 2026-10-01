import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listTimeClockEmployees } from "../actions";

export function getTimeClockEmployeesQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "time-clock-employees"] as const;
}

export function useTimeClockEmployeesQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getTimeClockEmployeesQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listTimeClockEmployees>>(
        organizationApiPath(organizationId, "time-clock/employees"),
      ),
  });
}
