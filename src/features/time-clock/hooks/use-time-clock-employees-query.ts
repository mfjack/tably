import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listTimeClockEmployees } from "../actions";

export function getTimeClockEmployeesQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "time-clock-employees"] as const;
}

export function useTimeClockEmployeesQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getTimeClockEmployeesQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listTimeClockEmployees(organizationId)),
  });
}
