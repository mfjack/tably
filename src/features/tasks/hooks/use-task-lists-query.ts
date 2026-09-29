import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listTaskLists } from "../actions";

export function getTaskListsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "task-lists"] as const;
}

export function useTaskListsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getTaskListsQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listTaskLists(organizationId)),
  });
}
