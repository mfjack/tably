import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { addTaskListsFromTemplates } from "../actions";
import { useInvalidateTaskLists } from "./use-invalidate-task-lists";

export function getAddTaskListsFromTemplatesMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "tasks", "add-templates"] as const;
}

export function useAddTaskListsFromTemplatesMutation(
  organizationId: OrganizationId,
) {
  const invalidateTaskLists = useInvalidateTaskLists(organizationId);

  return useMutation({
    mutationKey: getAddTaskListsFromTemplatesMutationKey(organizationId),
    mutationFn: async (templateIds: readonly string[]) =>
      unwrapActionResult(
        await addTaskListsFromTemplates(organizationId, templateIds),
      ),
    onSuccess: invalidateTaskLists,
  });
}
