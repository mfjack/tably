import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrganizationId } from "@/features/organizations/types";
import { TASK_PERIOD_LABELS } from "@/features/tasks/task-periods";
import type { Task, TaskList } from "@/features/tasks/types";
import { cn } from "@/lib/utils";
import { AddTaskForm } from "./add-task-form";
import { TaskItem } from "./task-item";

type TaskListCardProps = {
  organizationId: OrganizationId;
  taskList: TaskList;
  today: string;
  canManage: boolean;
  onToggleTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onRename: (taskList: TaskList) => void;
  onDelete: (taskList: TaskList) => void;
};

export function TaskListCard({
  organizationId,
  taskList,
  today,
  canManage,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onRename,
  onDelete,
}: TaskListCardProps) {
  const doneCount = taskList.tasks.filter((task) => task.completion).length;
  const taskCount = taskList.tasks.length;
  const isComplete = taskCount > 0 && doneCount === taskCount;

  return (
    <section
      aria-label={taskList.name}
      className="flex flex-col gap-4 rounded-2xl border bg-card p-4"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="truncate font-semibold text-base">{taskList.name}</h2>
          <p
            className={cn(
              "text-muted-foreground text-xs tabular-nums",
              isComplete && "font-medium text-foreground",
            )}
          >
            {taskList.period && `${TASK_PERIOD_LABELS[taskList.period]} · `}
            {isComplete
              ? "Tudo concluído"
              : `${doneCount} de ${taskCount} concluídas`}
          </p>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Opções do processo ${taskList.name}`}
                />
              }
            >
              <MoreHorizontal aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem onClick={() => onRename(taskList)}>
                <Pencil aria-hidden />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(taskList)}
              >
                <Trash2 aria-hidden />
                Excluir processo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {taskCount > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(doneCount / taskCount) * 100}%` }}
          />
        </div>
      )}

      {taskCount > 0 ? (
        <ul className="-mx-2 flex flex-col">
          {taskList.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              today={today}
              canManage={canManage}
              onToggle={onToggleTask}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          Nenhum item neste processo.
        </p>
      )}

      {canManage && (
        <AddTaskForm
          organizationId={organizationId}
          listId={taskList.id}
          listName={taskList.name}
        />
      )}
    </section>
  );
}
