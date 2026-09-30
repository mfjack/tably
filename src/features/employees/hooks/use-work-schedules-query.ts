import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listWorkSchedules } from "../actions";

export function getWorkSchedulesQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "work-schedules", "list"] as const;
}

export function useWorkSchedulesQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getWorkSchedulesQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listWorkSchedules(organizationId)),
  });
}
