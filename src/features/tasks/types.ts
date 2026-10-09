import type { OperatorId } from "@/features/operators/types";
import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type TaskListId = Brand<string, "TaskListId">;

export type TaskId = Brand<string, "TaskId">;

export type TaskFrequency = Database["public"]["Enums"]["task_frequency"];

export type TaskKind = Database["public"]["Enums"]["task_kind"];

export type TaskPeriod = Database["public"]["Enums"]["task_period"];

export type TemperatureRange = {
  minTemperature: number | null;
  maxTemperature: number | null;
};

export type TaskCompletion = {
  operatorName: string | null;
  completedAt: string;
  completedOn: string;
  temperature: number | null;
};

export type TaskAssignee = {
  id: OperatorId;
  name: string;
};

export type Task = TemperatureRange & {
  id: TaskId;
  title: string;
  kind: TaskKind;
  instructions: string | null;
  frequency: TaskFrequency;
  dueWeekday: number | null;
  dueDay: number | null;
  assignee: TaskAssignee | null;
  completion: TaskCompletion | null;
};

export type TemperatureTask = Pick<
  Task,
  "id" | "title" | "instructions" | "minTemperature" | "maxTemperature"
>;

export type TaskList = {
  id: TaskListId;
  name: string;
  period: TaskPeriod | null;
  tasks: Task[];
};

export type TaskBoard = {
  today: string;
  taskLists: TaskList[];
};

export type TemperatureRecord = TemperatureRange & {
  id: string;
  taskTitle: string;
  listName: string;
  temperature: number;
  completedOn: string;
  completedAt: string;
  operatorName: string | null;
};
