import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listTaskLists } from "../actions";

export function getTaskListsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "task-lists"] as const;
}

export function useTaskListsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getTaskListsQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listTaskLists>>(
        organizationApiPath(organizationId, "task-lists"),
      ),
  });
}
