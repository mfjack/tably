import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listWorkSchedules } from "../actions";

export function getWorkSchedulesQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "work-schedules", "list"] as const;
}

export function useWorkSchedulesQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getWorkSchedulesQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listWorkSchedules>>(
        organizationApiPath(organizationId, "work-schedules"),
      ),
  });
}
