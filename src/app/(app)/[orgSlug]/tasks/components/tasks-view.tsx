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
import type { OrganizationId } from "@/features/organizations/types";
import { useDeleteTaskListMutation } from "@/features/tasks/hooks/use-delete-task-list-mutation";
import { useDeleteTaskMutation } from "@/features/tasks/hooks/use-delete-task-mutation";
import { useSetTaskDoneMutation } from "@/features/tasks/hooks/use-set-task-done-mutation";
import { useTaskListsQuery } from "@/features/tasks/hooks/use-task-lists-query";
import type { Task, TaskList } from "@/features/tasks/types";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { PosHeaderDescription } from "../../pos/components/pos-header-description";
import { TaskListCard } from "./task-list-card";
import { TaskListFormDialog } from "./task-list-form-dialog";

const LOADING_CARD_COUNT = 3;
const GRID_CLASS_NAME = "grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3";

type TaskListFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; taskList: TaskList };

type TasksViewProps = {
  organizationId: OrganizationId;
  title: string;
  canManage: boolean;
};

export function TasksView({
  organizationId,
  title,
  canManage,
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

  const taskLists = taskListsQuery.data;

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
        ) : !taskLists ? (
          <div className={GRID_CLASS_NAME}>
            {Array.from({ length: LOADING_CARD_COUNT }, (_, cardIndex) => (
              <Skeleton
                key={`task-list-${cardIndex.toString()}`}
                className="h-56 rounded-2xl"
              />
            ))}
          </div>
        ) : taskLists.length === 0 ? (
          <ListEmptyState
            icon={ListChecks}
            title="Nenhuma lista de tarefas"
            description="Crie checklists como abertura, fechamento e limpeza. Eles reiniciam todo dia e mostram quem marcou cada tarefa."
            createLabel="Criar primeira lista"
            canCreate={canManage}
            onCreate={openCreateForm}
          />
        ) : (
          <div className={GRID_CLASS_NAME}>
            {taskLists.map((taskList) => (
              <TaskListCard
                key={taskList.id}
                organizationId={organizationId}
                taskList={taskList}
                canManage={canManage}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
                onRename={(list) =>
                  setFormState({ mode: "edit", taskList: list })
                }
                onDelete={setTaskListToDelete}
              />
            ))}
          </div>
        )}
      </PageContent>

      <TaskListFormDialog
        organizationId={organizationId}
        isOpen={formState.mode !== "closed"}
        taskList={formState.mode === "edit" ? formState.taskList : undefined}
        onClose={() => setFormState({ mode: "closed" })}
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
