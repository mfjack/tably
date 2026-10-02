"use client";

import { ListChecks, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  IRREVERSIBLE_ACTION_MESSAGE,
} from "@/components/dialog/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OperatorId, OperatorSummary } from "@/features/operators/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useDeleteTaskListMutation } from "@/features/tasks/hooks/use-delete-task-list-mutation";
import { useDeleteTaskMutation } from "@/features/tasks/hooks/use-delete-task-mutation";
import { useSetTaskDoneMutation } from "@/features/tasks/hooks/use-set-task-done-mutation";
import { useTaskListsQuery } from "@/features/tasks/hooks/use-task-lists-query";
import type { Task, TaskBoard, TaskList } from "@/features/tasks/types";
import { useSearchParamState } from "@/hooks/use-search-param-state";
import { createOptionParser } from "@/lib/search-params";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { PosHeaderDescription } from "../../pos/components/pos-header-description";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskListCard } from "./task-list-card";
import { TaskListFormDialog } from "./task-list-form-dialog";

const LOADING_CARD_COUNT = 3;
const GRID_CLASS_NAME = "grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3";

type TaskListFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; taskList: TaskList };

const TASK_FILTERS = ["all", "mine"] as const;

type TaskFilter = (typeof TASK_FILTERS)[number];

const parseTaskFilter = createOptionParser(TASK_FILTERS);

function filterTaskLists(
  taskBoard: TaskBoard,
  filter: TaskFilter,
  activeOperatorId: OperatorId | null,
): TaskList[] {
  if (filter === "all" || !activeOperatorId) return taskBoard.taskLists;
  return taskBoard.taskLists
    .map((taskList) => ({
      ...taskList,
      tasks: taskList.tasks.filter(
        (task) => task.assignee?.id === activeOperatorId,
      ),
    }))
    .filter((taskList) => taskList.tasks.length > 0);
}

type TasksViewProps = {
  organizationId: OrganizationId;
  title: string;
  canManage: boolean;
  operators: OperatorSummary[];
  activeOperatorId: OperatorId | null;
};

export function TasksView({
  organizationId,
  title,
  canManage,
  operators,
  activeOperatorId,
}: TasksViewProps) {
  const taskListsQuery = useTaskListsQuery(organizationId);
  const setTaskDoneMutation = useSetTaskDoneMutation(organizationId);
  const deleteTaskMutation = useDeleteTaskMutation(organizationId);
  const deleteTaskListMutation = useDeleteTaskListMutation(organizationId);
  const { mutate: setTaskDone } = setTaskDoneMutation;
  const { mutate: removeTask } = deleteTaskMutation;
  const [formState, setFormState] = useState<TaskListFormState>({
    mode: "closed",
  });
  const [taskListToDelete, setTaskListToDelete] = useState<TaskList | null>(
    null,
  );
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [filter, setFilter] = useSearchParamState({
    key: "filter",
    defaultValue: "all",
    parse: parseTaskFilter,
  });

  const openCreateForm = useCallback(() => {
    setFormState({ mode: "create" });
  }, []);

  const toggleTask = useCallback(
    (task: Task) =>
      setTaskDone(
        { taskId: task.id, isDone: task.completion === null },
        { onError: (error) => toast.error(error.message) },
      ),
    [setTaskDone],
  );

  const deleteTask = useCallback(
    (task: Task) =>
      removeTask(task.id, {
        onError: (error) => toast.error(error.message),
      }),
    [removeTask],
  );

  function changeFilter(value: string) {
    const nextFilter = parseTaskFilter(value);
    if (nextFilter) setFilter(nextFilter);
  }

  function confirmDeleteTaskList() {
    if (!taskListToDelete) return;
    deleteTaskListMutation.mutate(taskListToDelete.id, {
      onSuccess: () => {
        toast.success(`Lista ${taskListToDelete.name} excluída.`);
        setTaskListToDelete(null);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  const taskBoard = taskListsQuery.data;
  const taskLists = taskBoard
    ? filterTaskLists(taskBoard, filter, activeOperatorId)
    : undefined;

  return (
    <>
      <PageHeader
        title={title}
        description={<PosHeaderDescription />}
        actions={
          canManage && (
            <Button className="h-10" onClick={openCreateForm}>
              <Plus aria-hidden />
              Nova lista
            </Button>
          )
        }
      />
      <PageContent>
        {taskListsQuery.error ? (
          <Alert variant="destructive">
            <AlertDescription>{taskListsQuery.error.message}</AlertDescription>
          </Alert>
        ) : !taskBoard || !taskLists ? (
          <div className={GRID_CLASS_NAME}>
            {Array.from({ length: LOADING_CARD_COUNT }, (_, cardIndex) => (
              <Skeleton
                key={`task-list-${cardIndex.toString()}`}
                className="h-56 rounded-2xl"
              />
            ))}
          </div>
        ) : taskBoard.taskLists.length === 0 ? (
          <ListEmptyState
            icon={ListChecks}
            title="Nenhuma lista de tarefas"
            description="Crie checklists como abertura, fechamento e limpeza. As tarefas podem ser diárias, semanais ou mensais e mostram quem marcou cada uma."
            createLabel="Criar primeira lista"
            canCreate={canManage}
            onCreate={openCreateForm}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {activeOperatorId && (
              <Tabs value={filter} onValueChange={changeFilter}>
                <TabsList className="group-data-horizontal/tabs:h-10">
                  <TabsTrigger value="all" className="px-4">
                    Todas
                  </TabsTrigger>
                  <TabsTrigger value="mine" className="px-4">
                    Minhas tarefas
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            {taskLists.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground text-sm">
                Nenhuma tarefa atribuída a você.
              </p>
            ) : (
              <div className={GRID_CLASS_NAME}>
                {taskLists.map((taskList) => (
                  <TaskListCard
                    key={taskList.id}
                    organizationId={organizationId}
                    taskList={taskList}
                    today={taskBoard.today}
                    canManage={canManage}
                    onToggleTask={toggleTask}
                    onEditTask={setTaskToEdit}
                    onDeleteTask={deleteTask}
                    onRename={(list) =>
                      setFormState({ mode: "edit", taskList: list })
                    }
                    onDelete={setTaskListToDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </PageContent>

      <TaskListFormDialog
        organizationId={organizationId}
        isOpen={formState.mode !== "closed"}
        taskList={formState.mode === "edit" ? formState.taskList : undefined}
        onClose={() => setFormState({ mode: "closed" })}
      />
      <TaskFormDialog
        organizationId={organizationId}
        task={taskToEdit}
        operators={operators}
        onClose={() => setTaskToEdit(null)}
      />
      <ConfirmDialog
        isOpen={taskListToDelete !== null}
        onOpenChange={(isOpen) => !isOpen && setTaskListToDelete(null)}
        title="Excluir lista?"
        description={`A lista ${taskListToDelete?.name ?? ""} e as tarefas dela serão apagadas. ${IRREVERSIBLE_ACTION_MESSAGE}`}
        confirmLabel="Excluir"
        isConfirming={deleteTaskListMutation.isPending}
        onConfirm={confirmDeleteTaskList}
      />
    </>
  );
}
