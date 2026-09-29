"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrganizationId } from "@/features/organizations/types";
import type { Task, TaskList } from "@/features/tasks/types";
import { cn } from "@/lib/utils";
import { AddTaskForm } from "./add-task-form";
import { TaskItem } from "./task-item";

type TaskListCardProps = {
  organizationId: OrganizationId;
  taskList: TaskList;
  canManage: boolean;
  onToggleTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onRename: (taskList: TaskList) => void;
  onDelete: (taskList: TaskList) => void;
};

export function TaskListCard({
  organizationId,
  taskList,
  canManage,
  onToggleTask,
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
                  aria-label={`Opções da lista ${taskList.name}`}
                />
              }
            >
              <MoreHorizontal aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem onClick={() => onRename(taskList)}>
                <Pencil aria-hidden />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(taskList)}
              >
                <Trash2 aria-hidden />
                Excluir lista
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
              canManage={canManage}
              onToggle={onToggleTask}
              onDelete={onDeleteTask}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          Nenhuma tarefa nesta lista.
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
