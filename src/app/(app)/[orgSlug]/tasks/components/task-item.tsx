import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task } from "@/features/tasks/types";
import { cn } from "@/lib/utils";

type TaskItemProps = {
  task: Task;
  canManage: boolean;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
};

function describeCompletion(task: Task) {
  if (!task.completion) return null;
  const time = format(new Date(task.completion.completedAt), "HH:mm");
  return task.completion.operatorName
    ? `${task.completion.operatorName} · ${time}`
    : time;
}

export function TaskItem({
  task,
  canManage,
  onToggle,
  onDelete,
}: TaskItemProps) {
  const isDone = task.completion !== null;
  const completionLabel = describeCompletion(task);

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
              : "border-border",
          )}
        >
          {isDone && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="flex min-w-0 flex-col">
          <span
            className={cn(
              "text-sm break-words",
              isDone && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </span>
          {completionLabel && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {completionLabel}
            </span>
          )}
        </span>
      </button>
      {canManage && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Excluir tarefa ${task.title}`}
          className="mt-1 shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
          onClick={() => onDelete(task)}
        >
          <X aria-hidden />
        </Button>
      )}
    </li>
  );
}
