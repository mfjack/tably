import { format } from "date-fns";
import { Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getCompletionDayLabel,
  getScheduleLabel,
  isTaskOverdue,
} from "@/features/tasks/task-schedule";
import type { Task } from "@/features/tasks/types";
import { getInitials } from "@/lib/get-initials";
import { cn } from "@/lib/utils";

type TaskItemProps = {
  task: Task;
  today: string;
  canManage: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

function describeCompletion(task: Task, today: string) {
  if (!task.completion) return null;
  const time = format(new Date(task.completion.completedAt), "HH:mm");
  const day = getCompletionDayLabel(task, today);
  const when = day ? `${day} ${time}` : time;
  return task.completion.operatorName
    ? `${task.completion.operatorName} · ${when}`
    : when;
}

export function TaskItem({
  task,
  today,
  canManage,
  onToggle,
  onEdit,
  onDelete,
}: TaskItemProps) {
  const isDone = task.completion !== null;
  const isOverdue = isTaskOverdue(task, today);
  const completionLabel = describeCompletion(task, today);
  const scheduleLabel = getScheduleLabel(task);

  return (
    <li className="group flex items-start gap-2">
      <button
        type="button"
        aria-pressed={isDone}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        onClick={() => onToggle(task)}
      >
        <span
          aria-hidden
          className={cn(
            "mt-px flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
            isDone
              ? "border-primary bg-primary text-primary-foreground"
              : isOverdue
                ? "border-destructive"
                : "border-border",
          )}
        >
          {isDone && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cn(
              "break-words text-sm",
              isDone && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </span>
          {(scheduleLabel || isOverdue || completionLabel) && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {scheduleLabel && (
                <span className="text-muted-foreground">{scheduleLabel}</span>
              )}
              {isOverdue && (
                <span className="font-medium text-destructive">Atrasada</span>
              )}
              {completionLabel && (
                <span className="text-muted-foreground tabular-nums">
                  {completionLabel}
                </span>
              )}
            </span>
          )}
        </span>
        {task.assignee && (
          <span
            role="img"
            aria-label={`Responsável: ${task.assignee.name}`}
            title={task.assignee.name}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-[0.625rem] text-muted-foreground"
          >
            {getInitials(task.assignee.name)}
          </span>
        )}
      </button>
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Opções da tarefa ${task.title}`}
                className="mt-1 shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-popup-open:opacity-100 max-md:opacity-100"
              />
            }
          >
            <MoreHorizontal aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil aria-hidden />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(task)}
            >
              <Trash2 aria-hidden />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
