import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveTaskList } from "../actions";
import type { TaskListInput } from "../schemas";
import type { TaskListId } from "../types";
import { useInvalidateTaskLists } from "./use-invalidate-task-lists";

type SaveTaskListVariables = {
  listId: TaskListId | null;
  input: TaskListInput;
};

export function getSaveTaskListMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "task-lists", "save"] as const;
}

export function useSaveTaskListMutation(organizationId: OrganizationId) {
  const invalidateTaskLists = useInvalidateTaskLists(organizationId);

  return useMutation({
    mutationKey: getSaveTaskListMutationKey(organizationId),
    mutationFn: async ({ listId, input }: SaveTaskListVariables) =>
      unwrapActionResult(await saveTaskList(organizationId, listId, input)),
    onSuccess: invalidateTaskLists,
  });
}
