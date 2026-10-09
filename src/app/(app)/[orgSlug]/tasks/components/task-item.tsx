import { format } from "date-fns";
import {
  Check,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Thermometer,
  Trash2,
} from "lucide-react";
import { useState } from "react";
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
import {
  describeTemperatureRange,
  formatTemperature,
  isTemperatureOutOfRange,
} from "@/features/tasks/task-temperature";
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
  const [isShowingInstructions, setIsShowingInstructions] = useState(false);
  const isDone = task.completion !== null;
  const isOverdue = isTaskOverdue(task, today);
  const completionLabel = describeCompletion(task, today);
  const scheduleLabel = getScheduleLabel(task);
  const isTemperature = task.kind === "temperature";
  const recordedTemperature = task.completion?.temperature ?? null;
  const isOutOfRange =
    recordedTemperature !== null &&
    isTemperatureOutOfRange(recordedTemperature, task);

  return (
    <li className="group flex flex-col">
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-pressed={isDone}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          onClick={() => onToggle(task)}
        >
          <span
            aria-hidden
            className={cn(
              "mt-px flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
              isDone
                ? isOutOfRange
                  ? "border-destructive bg-destructive text-background"
                  : "border-primary bg-primary text-primary-foreground"
                : isOverdue
                  ? "border-destructive"
                  : "border-border",
            )}
          >
            {isDone ? (
              <Check className="size-3.5" strokeWidth={3} />
            ) : (
              isTemperature && (
                <Thermometer className="size-3 text-muted-foreground" />
              )
            )}
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
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {recordedTemperature !== null ? (
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    isOutOfRange ? "text-destructive" : "text-foreground",
                  )}
                >
                  {formatTemperature(recordedTemperature)}
                  {isOutOfRange && " · fora do limite"}
                </span>
              ) : (
                isTemperature && (
                  <span className="text-muted-foreground">
                    Limite {describeTemperatureRange(task)}
                  </span>
                )
              )}
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
        {task.instructions && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={isShowingInstructions}
            aria-label={`Como fazer: ${task.title}`}
            className="mt-1 shrink-0 text-muted-foreground"
            onClick={() => setIsShowingInstructions((isShowing) => !isShowing)}
          >
            <ChevronDown
              aria-hidden
              className={cn(
                "transition-transform",
                isShowingInstructions && "rotate-180",
              )}
            />
          </Button>
        )}
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
      </div>
      {isShowingInstructions && task.instructions && (
        <p className="mx-2 mb-2 ml-10 rounded-lg bg-muted/60 px-3 py-2 text-muted-foreground text-xs leading-relaxed">
          <span className="font-medium text-foreground">Como fazer: </span>
          {task.instructions}
        </p>
      )}
    </li>
  );
}
