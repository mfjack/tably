import * as z from "zod";
import { Constants } from "@/lib/supabase/database.types";

const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Descreva a tarefa.")
  .max(120, "Tarefa muito longa.");

const temperatureSchema = z
  .number()
  .min(-50, "Temperatura inválida.")
  .max(300, "Temperatura inválida.");

export const taskListSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do processo.")
    .max(60, "Nome muito longo."),
  period: z.string().optional(),
});

export const newTaskSchema = z.object({ title: taskTitleSchema });

export const taskSchema = z
  .object({
    title: taskTitleSchema,
    kind: z.enum(Constants.public.Enums.task_kind),
    instructions: z
      .string()
      .trim()
      .max(1000, "Instrução muito longa.")
      .optional(),
    minTemperature: temperatureSchema.optional(),
    maxTemperature: temperatureSchema.optional(),
    frequency: z.enum(Constants.public.Enums.task_frequency),
    dueWeekday: z.string().optional(),
    dueDay: z.string().optional(),
    assignedOperatorId: z.string().optional(),
  })
  .refine(
    (values) =>
      values.kind === "check" ||
      values.minTemperature !== undefined ||
      values.maxTemperature !== undefined,
    {
      message: "Informe a temperatura mínima, a máxima ou as duas.",
      path: ["maxTemperature"],
    },
  )
  .refine(
    (values) =>
      values.minTemperature === undefined ||
      values.maxTemperature === undefined ||
      values.minTemperature <= values.maxTemperature,
    {
      message: "A máxima precisa ser maior que a mínima.",
      path: ["maxTemperature"],
    },
  );

export const temperatureReadingSchema = z.object({
  temperature: temperatureSchema
    .optional()
    .refine((value) => value !== undefined, {
      message: "Informe a temperatura medida.",
    }),
});

export type TaskListInput = z.infer<typeof taskListSchema>;
export type NewTaskInput = z.infer<typeof newTaskSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type TemperatureReadingInput = z.infer<typeof temperatureReadingSchema>;
