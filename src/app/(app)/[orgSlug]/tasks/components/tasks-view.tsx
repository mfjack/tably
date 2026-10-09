"use client";

import { LayoutTemplate, ListChecks, Plus, Thermometer } from "lucide-react";
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
import { TemperatureReadingDialog } from "@/features/tasks/components/temperature-reading-dialog";
import { useDeleteTaskListMutation } from "@/features/tasks/hooks/use-delete-task-list-mutation";
import { useDeleteTaskMutation } from "@/features/tasks/hooks/use-delete-task-mutation";
import { useSetTaskDoneMutation } from "@/features/tasks/hooks/use-set-task-done-mutation";
import { useTaskListsQuery } from "@/features/tasks/hooks/use-task-lists-query";
import type {
  Task,
  TaskBoard,
  TaskList,
  TemperatureTask,
} from "@/features/tasks/types";
import { useSearchParamState } from "@/hooks/use-search-param-state";
import { createOptionParser } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { PosHeaderDescription } from "../../pos/components/pos-header-description";
import { ProcessTemplatesDialog } from "./process-templates-dialog";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskListCard } from "./task-list-card";
import { TaskListFormDialog } from "./task-list-form-dialog";
import { TemperatureLogDialog } from "./temperature-log-dialog";

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
  businessName: string;
  title: string;
  canManage: boolean;
  operators: OperatorSummary[];
  activeOperatorId: OperatorId | null;
};

export function TasksView({
  organizationId,
  businessName,
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
  const [taskToMeasure, setTaskToMeasure] = useState<Task | null>(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isTemperatureLogOpen, setIsTemperatureLogOpen] = useState(false);
  const [filter, setFilter] = useSearchParamState({
    key: "filter",
    defaultValue: "all",
    parse: parseTaskFilter,
  });

  const openCreateForm = useCallback(() => {
    setFormState({ mode: "create" });
  }, []);

  const toggleTask = useCallback(
    (task: Task) => {
      if (task.kind === "temperature" && task.completion === null) {
        setTaskToMeasure(task);
        return;
      }
      setTaskDone(
        { taskId: task.id, isDone: task.completion === null },
        { onError: (error) => toast.error(error.message) },
      );
    },
    [setTaskDone],
  );

  function recordTemperature(task: TemperatureTask, temperature: number) {
    setTaskDone(
      { taskId: task.id, isDone: true, temperature },
      {
        onSuccess: () => setTaskToMeasure(null),
        onError: (error) => toast.error(error.message),
      },
    );
  }

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
        toast.success(`Processo ${taskListToDelete.name} excluído.`);
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
          <>
            <Button
              variant="outline"
              className="h-10"
              aria-label="Temperaturas"
              onClick={() => setIsTemperatureLogOpen(true)}
            >
              <Thermometer aria-hidden />
              <span className="max-sm:hidden">Temperaturas</span>
            </Button>
            {canManage && (
              <>
                <Button
                  variant="outline"
                  className="h-10"
                  aria-label="Modelos prontos"
                  onClick={() => setIsTemplatesOpen(true)}
                >
                  <LayoutTemplate aria-hidden />
                  <span className="max-sm:hidden">Modelos prontos</span>
                </Button>
                <Button className="h-10" onClick={openCreateForm}>
                  <Plus aria-hidden />
                  <span className="max-sm:hidden">Novo processo</span>
                </Button>
              </>
            )}
          </>
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
            title="Nenhum processo ainda"
            description="Comece pelos modelos prontos de abertura, fechamento, higiene e controle de temperatura para cafeterias, restaurantes e açaiterias. Depois é só ajustar à sua rotina."
            createLabel="Escolher modelos prontos"
            canCreate={canManage}
            onCreate={() => setIsTemplatesOpen(true)}
          />
        ) : (
          <div className="flex min-h-0 flex-col gap-4">
            {activeOperatorId && (
              <Tabs
                value={filter}
                onValueChange={changeFilter}
                className="shrink-0"
              >
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
              <div className={cn(GRID_CLASS_NAME, "min-h-0 overflow-y-auto")}>
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
      <ProcessTemplatesDialog
        organizationId={organizationId}
        isOpen={isTemplatesOpen}
        existingListNames={
          taskBoard?.taskLists.map((taskList) => taskList.name) ?? []
        }
        onClose={() => setIsTemplatesOpen(false)}
      />
      <TemperatureReadingDialog
        task={taskToMeasure}
        isSubmitting={setTaskDoneMutation.isPending}
        onSubmit={recordTemperature}
        onClose={() => setTaskToMeasure(null)}
      />
      <TemperatureLogDialog
        organizationId={organizationId}
        businessName={businessName}
        isOpen={isTemperatureLogOpen}
        onClose={() => setIsTemperatureLogOpen(false)}
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
        title="Excluir processo?"
        description={`O processo ${taskListToDelete?.name ?? ""} e os itens dele serão apagados. ${IRREVERSIBLE_ACTION_MESSAGE}`}
        confirmLabel="Excluir"
        isConfirming={deleteTaskListMutation.isPending}
        onConfirm={confirmDeleteTaskList}
      />
    </>
  );
}
