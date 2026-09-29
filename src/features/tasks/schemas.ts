import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";

const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Descreva a tarefa.")
  .max(120, "Tarefa muito longa.");

export const taskListSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da lista.")
    .max(60, "Nome muito longo."),
});

export const newTaskSchema = z.object({ title: taskTitleSchema });

export const taskSchema = z.object({
  title: taskTitleSchema,
  frequency: z.enum(Constants.public.Enums.task_frequency),
  dueWeekday: z.string().optional(),
  dueDay: z.string().optional(),
  assignedOperatorId: z.string().optional(),
});

export type TaskListInput = z.infer<typeof taskListSchema>;
export type NewTaskInput = z.infer<typeof newTaskSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
