import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { updateTask } from "../actions";
import type { TaskInput } from "../schemas";
import type { TaskId } from "../types";
import { useInvalidateTaskLists } from "./use-invalidate-task-lists";

type UpdateTaskVariables = {
  taskId: TaskId;
  input: TaskInput;
};

export function getUpdateTaskMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "tasks", "update"] as const;
}

export function useUpdateTaskMutation(organizationId: OrganizationId) {
  const invalidateTaskLists = useInvalidateTaskLists(organizationId);

  return useMutation({
    mutationKey: getUpdateTaskMutationKey(organizationId),
    mutationFn: async ({ taskId, input }: UpdateTaskVariables) =>
      unwrapActionResult(await updateTask(organizationId, taskId, input)),
    onSuccess: invalidateTaskLists,
  });
}
