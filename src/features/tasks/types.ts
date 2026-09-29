import type { Brand } from "@/lib/brand";

export type TaskListId = Brand<string, "TaskListId">;

export type TaskId = Brand<string, "TaskId">;

export type TaskCompletion = {
  operatorName: string | null;
  completedAt: string;
};

export type Task = {
  id: TaskId;
  title: string;
  completion: TaskCompletion | null;
};

export type TaskList = {
  id: TaskListId;
  name: string;
  tasks: Task[];
};
