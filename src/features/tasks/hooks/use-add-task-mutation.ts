import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { addTask } from "../actions";
import type { NewTaskInput } from "../schemas";
import type { TaskListId } from "../types";
import { useInvalidateTaskLists } from "./use-invalidate-task-lists";

type AddTaskVariables = {
  listId: TaskListId;
  input: NewTaskInput;
};

export function getAddTaskMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "tasks", "add"] as const;
}

export function useAddTaskMutation(organizationId: OrganizationId) {
  const invalidateTaskLists = useInvalidateTaskLists(organizationId);

  return useMutation({
    mutationKey: getAddTaskMutationKey(organizationId),
    mutationFn: async ({ listId, input }: AddTaskVariables) =>
      unwrapActionResult(await addTask(organizationId, listId, input)),
    onSuccess: invalidateTaskLists,
  });
}
