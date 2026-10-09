import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { setTaskDone } from "../actions";
import type { TaskBoard, TaskId } from "../types";
import { getTaskListsQueryKey } from "./use-task-lists-query";
import { getTemperatureRecordsQueryKey } from "./use-temperature-records-query";

type SetTaskDoneVariables = {
  taskId: TaskId;
  isDone: boolean;
  temperature?: number;
};

function applyTaskDone(
  taskBoard: TaskBoard,
  { taskId, isDone, temperature }: SetTaskDoneVariables,
): TaskBoard {
  return {
    ...taskBoard,
    taskLists: taskBoard.taskLists.map((taskList) => ({
      ...taskList,
      tasks: taskList.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completion: isDone
                ? {
                    operatorName: null,
                    completedAt: new Date().toISOString(),
                    completedOn: taskBoard.today,
                    temperature: temperature ?? null,
                  }
                : null,
            }
          : task,
      ),
    })),
  };
}

export function getSetTaskDoneMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "tasks", "set-done"] as const;
}

export function useSetTaskDoneMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();
  const queryKey = getTaskListsQueryKey(organizationId);

  return useMutation({
    mutationKey: getSetTaskDoneMutationKey(organizationId),
    mutationFn: async ({ taskId, isDone, temperature }: SetTaskDoneVariables) =>
      unwrapActionResult(await setTaskDone(taskId, isDone, temperature)),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousTaskBoard = queryClient.getQueryData<TaskBoard>(queryKey);
      queryClient.setQueryData<TaskBoard>(queryKey, (taskBoard) =>
        taskBoard ? applyTaskDone(taskBoard, variables) : taskBoard,
      );
      return { previousTaskBoard };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previousTaskBoard);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({
          queryKey: getTemperatureRecordsQueryKey(organizationId),
        }),
      ]),
  });
}
