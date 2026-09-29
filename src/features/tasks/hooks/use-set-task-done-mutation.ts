import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { setTaskDone } from "../actions";
import type { TaskId, TaskList } from "../types";
import { getTaskListsQueryKey } from "./use-task-lists-query";

type SetTaskDoneVariables = {
  taskId: TaskId;
  isDone: boolean;
};

function applyTaskDone(
  taskLists: TaskList[],
  { taskId, isDone }: SetTaskDoneVariables,
): TaskList[] {
  return taskLists.map((taskList) => ({
    ...taskList,
    tasks: taskList.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            completion: isDone
              ? { operatorName: null, completedAt: new Date().toISOString() }
              : null,
          }
        : task,
    ),
  }));
}

export function getSetTaskDoneMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "tasks", "set-done"] as const;
}

export function useSetTaskDoneMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();
  const queryKey = getTaskListsQueryKey(organizationId);

  return useMutation({
    mutationKey: getSetTaskDoneMutationKey(organizationId),
    mutationFn: async ({ taskId, isDone }: SetTaskDoneVariables) =>
      unwrapActionResult(await setTaskDone(taskId, isDone)),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousTaskLists = queryClient.getQueryData<TaskList[]>(queryKey);
      queryClient.setQueryData<TaskList[]>(queryKey, (taskLists) =>
        taskLists ? applyTaskDone(taskLists, variables) : taskLists,
      );
      return { previousTaskLists };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previousTaskLists);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
