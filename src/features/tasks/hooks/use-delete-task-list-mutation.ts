import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteTaskList } from "../actions";
import type { TaskListId } from "../types";
import { useInvalidateTaskLists } from "./use-invalidate-task-lists";

export function getDeleteTaskListMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "task-lists", "delete"] as const;
}

export function useDeleteTaskListMutation(organizationId: OrganizationId) {
  const invalidateTaskLists = useInvalidateTaskLists(organizationId);

  return useMutation({
    mutationKey: getDeleteTaskListMutationKey(organizationId),
    mutationFn: async (listId: TaskListId) =>
      unwrapActionResult(await deleteTaskList(organizationId, listId)),
    onSuccess: invalidateTaskLists,
  });
}
