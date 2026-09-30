import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const reasonSchema = z
  .string()
  .trim()
  .min(3, "Explique o motivo.")
  .max(200, "Motivo muito longo.");

export const manualPunchSchema = z.object({
  workDate: z.string().regex(DATE_PATTERN, "Informe o dia."),
  time: z.string().regex(TIME_PATTERN, "Informe o horário."),
  isNextDay: z.boolean(),
  reason: reasonSchema,
});

export type ManualPunchInput = z.infer<typeof manualPunchSchema>;

export const voidPunchSchema = z.object({ reason: reasonSchema });

export type VoidPunchInput = z.infer<typeof voidPunchSchema>;

export const timeOffSchema = z
  .object({
    kind: z.enum(Constants.public.Enums.time_off_kind),
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
