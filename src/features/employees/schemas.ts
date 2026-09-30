import { z } from "zod";
import { isValidCpf, isValidPis } from "@/lib/masks";
import { Constants } from "@/lib/supabase/database.types";

export const EMPLOYEE_PIN_LENGTH = 4;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_TOLERANCE_PER_MARK = 30;
const MAX_DAILY_TOLERANCE = 60;
const MAX_DEPENDENTS = 20;

export const DEFAULT_MARK_TOLERANCE_MINUTES = 5;
export const DEFAULT_DAILY_TOLERANCE_MINUTES = 10;

const requiredDateSchema = (message: string) =>
  z.string().regex(DATE_PATTERN, message);

const optionalDateSchema = z.union([
  z.literal(""),
  z.string().regex(DATE_PATTERN, "Data inválida."),
]);

const optionalTimeSchema = z.union([
  z.literal(""),
  z.string().regex(TIME_PATTERN, "Horário inválido."),
]);

export const employeeSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Informe o nome.")
      .max(100, "Nome muito longo."),
    cpf: z.string().refine(isValidCpf, "CPF inválido."),
    pis: z
      .string()
      .refine((pis) => pis === "" || isValidPis(pis), "PIS inválido."),
    birthDate: optionalDateSchema,
    phone: z
      .string()
      .refine(
        (phone) => phone === "" || /^\d{10,11}$/.test(phone),
        "Telefone incompleto.",
      ),
    jobTitle: z
      .string()
      .trim()
      .min(1, "Informe o cargo.")
      .max(60, "Cargo muito longo."),
    cbo: z
      .string()
      .refine((cbo) => cbo === "" || /^\d{6}$/.test(cbo), "CBO incompleto."),
    employmentType: z.enum(Constants.public.Enums.employment_type),
    admissionDate: requiredDateSchema("Informe a data de admissão."),
    effectiveDate: optionalDateSchema,
    terminationDate: optionalDateSchema,
    salary: z
      .number({ error: "Informe o salário." })
      .positive("Informe o salário."),
    workScheduleId: z.string().optional(),
    overtimePolicy: z.enum(Constants.public.Enums.overtime_policy),
    dependents: z.number().int().min(0).max(MAX_DEPENDENTS).optional(),
    hasTransportVoucher: z.boolean(),
    notes: z.string().trim().max(300, "Observação muito longa."),
    hasSystemAccess: z.boolean(),
    allowedModules: z.array(z.enum(Constants.public.Enums.app_module)),
    canAccessSettings: z.boolean(),
  })
  .refine(
    (employee) =>
      employee.effectiveDate === "" ||
      employee.effectiveDate >= employee.admissionDate,
    {
      message: "A efetivação não pode ser antes da admissão.",
      path: ["effectiveDate"],
    },
  )
  .refine(
    (employee) =>
      employee.terminationDate === "" ||
      employee.terminationDate >= employee.admissionDate,
    {
      message: "O desligamento não pode ser antes da admissão.",
      path: ["terminationDate"],
    },
  )
  .refine(
    (employee) =>
      !employee.hasSystemAccess ||
      employee.allowedModules.length > 0 ||
      employee.canAccessSettings,
    {
      message: "Escolha pelo menos uma página.",
      path: ["allowedModules"],
    },
  );

export type EmployeeInput = z.infer<typeof employeeSchema>;

const workScheduleDaySchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    isWorkday: z.boolean(),
    startTime: optionalTimeSchema,
    breakStartTime: optionalTimeSchema,
    breakEndTime: optionalTimeSchema,
    endTime: optionalTimeSchema,
  })
  .refine((day) => !day.isWorkday || day.startTime !== "", {
    message: "Informe a entrada.",
    path: ["startTime"],
  })
  .refine((day) => !day.isWorkday || day.endTime !== "", {
    message: "Informe a saída.",
    path: ["endTime"],
  })
  .refine(
    (day) =>
      !day.isWorkday ||
      (day.breakStartTime === "") === (day.breakEndTime === ""),
    {
      message: "Informe o início e o fim do intervalo.",
      path: ["breakEndTime"],
    },
  );

export const workScheduleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da jornada.")
    .max(60, "Nome muito longo."),
  markToleranceMinutes: z
    .number()
    .int()
    .min(0)
    .max(MAX_TOLERANCE_PER_MARK, `No máximo ${MAX_TOLERANCE_PER_MARK} min.`)
    .optional(),
  dailyToleranceMinutes: z
    .number()
    .int()
    .min(0)
    .max(MAX_DAILY_TOLERANCE, `No máximo ${MAX_DAILY_TOLERANCE} min.`)
    .optional(),
  days: z
    .array(workScheduleDaySchema)
    .length(7)
    .refine((days) => days.some((day) => day.isWorkday), {
      message: "Marque pelo menos um dia de trabalho.",
    }),
});

export type WorkScheduleInput = z.infer<typeof workScheduleSchema>;

export const holidaySchema = z.object({
  date: requiredDateSchema("Informe a data."),
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do feriado.")
    .max(60, "Nome muito longo."),
});

export type HolidayInput = z.infer<typeof holidaySchema>;
