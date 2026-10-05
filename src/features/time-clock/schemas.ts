import * as z from "zod";
import { SELECTABLE_TIME_OFF_KINDS } from "./labels";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const reasonSchema = z
  .string()
  .trim()
  .min(3, "Explique o motivo.")
  .max(200, "Motivo muito longo.");

export const dayPunchesSchema = z.object({
  workDate: z.string().regex(DATE_PATTERN, "Informe o dia."),
  punches: z
    .array(
      z.object({
        time: z.string().regex(TIME_PATTERN, "Horário inválido."),
        isNextDay: z.boolean(),
      }),
    )
    .min(1, "Preencha pelo menos um horário."),
  reason: reasonSchema,
});

export type DayPunchesInput = z.infer<typeof dayPunchesSchema>;

export const dayAdjustmentFormSchema = z.object({
  times: z
    .array(
      z.object({
        value: z
          .string()
          .refine(
            (time) => time === "" || TIME_PATTERN.test(time),
            "Horário inválido.",
          ),
      }),
    )
    .refine((times) => times.some((time) => time.value !== ""), {
      message: "Preencha pelo menos um horário.",
    }),
  reason: reasonSchema,
});

export type DayAdjustmentFormInput = z.infer<typeof dayAdjustmentFormSchema>;

export const voidPunchSchema = z.object({ reason: reasonSchema });

export type VoidPunchInput = z.infer<typeof voidPunchSchema>;

export const timeOffSchema = z
  .object({
    kind: z.enum(SELECTABLE_TIME_OFF_KINDS, { error: "Escolha o tipo." }),
    startDate: z.string().regex(DATE_PATTERN, "Informe o início."),
    endDate: z.string().regex(DATE_PATTERN, "Informe o fim."),
    notes: z.string().trim().max(200, "Observação muito longa."),
  })
  .refine((timeOff) => timeOff.endDate >= timeOff.startDate, {
    message: "O fim não pode ser antes do início.",
    path: ["endDate"],
  });

export type TimeOffInput = z.infer<typeof timeOffSchema>;

export const registerPunchResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("registered"),
    nsr: z.number(),
    punchedAt: z.string(),
    workDate: z.string(),
    hash: z.string(),
    employeeName: z.string(),
    employeeCpf: z.string(),
    employeePis: z.string().nullable(),
    dayPunches: z.array(z.string()),
  }),
  z.object({ status: z.literal("invalid_pin") }),
  z.object({ status: z.literal("locked"), lockedUntil: z.string() }),
  z.object({ status: z.literal("duplicate"), punchedAt: z.string() }),
  z.object({ status: z.literal("inactive") }),
  z.object({ status: z.literal("not_found") }),
]);
