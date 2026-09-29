import { z } from "zod";

export const taskListSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da lista.")
    .max(60, "Nome muito longo."),
});

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Descreva a tarefa.")
    .max(120, "Tarefa muito longa."),
});

export type TaskListInput = z.infer<typeof taskListSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
