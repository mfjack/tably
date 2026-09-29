import type { OperatorId } from "@/features/operators/types";
import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type TaskListId = Brand<string, "TaskListId">;

export type TaskId = Brand<string, "TaskId">;

export type TaskFrequency = Database["public"]["Enums"]["task_frequency"];

export type TaskCompletion = {
  operatorName: string | null;
  completedAt: string;
  completedOn: string;
};

export type TaskAssignee = {
  id: OperatorId;
  name: string;
};

export type Task = {
  id: TaskId;
  title: string;
  frequency: TaskFrequency;
  dueWeekday: number | null;
  dueDay: number | null;
  assignee: TaskAssignee | null;
  completion: TaskCompletion | null;
};

export type TaskList = {
  id: TaskListId;
  name: string;
  tasks: Task[];
};

export type TaskBoard = {
  today: string;
  taskLists: TaskList[];
};
