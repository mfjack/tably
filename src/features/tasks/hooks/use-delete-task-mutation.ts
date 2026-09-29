import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteTask } from "../actions";
import type { TaskId } from "../types";
import { useInvalidateTaskLists } from "./use-invalidate-task-lists";

export function getDeleteTaskMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "tasks", "delete"] as const;
}

export function useDeleteTaskMutation(organizationId: OrganizationId) {
  const invalidateTaskLists = useInvalidateTaskLists(organizationId);

  return useMutation({
    mutationKey: getDeleteTaskMutationKey(organizationId),
    mutationFn: async (taskId: TaskId) =>
      unwrapActionResult(await deleteTask(organizationId, taskId)),
    onSuccess: invalidateTaskLists,
  });
}
