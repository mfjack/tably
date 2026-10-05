import type { TimesheetDayKind } from "./timesheet";
import type { TimeOffKind } from "./types";

export const TIME_OFF_KIND_LABELS = {
  medical_certificate: "Atestado médico",
  vacation: "Férias",
  day_off: "Folga",
  justified_absence: "Falta justificada",
  unjustified_absence: "Falta",
} as const satisfies Record<TimeOffKind, string>;

export const SELECTABLE_TIME_OFF_KINDS = [
  "medical_certificate",
  "vacation",
  "day_off",
  "unjustified_absence",
] as const satisfies readonly TimeOffKind[];

export const TIMESHEET_DAY_KIND_LABELS = {
  workday: "Dia útil",
  rest_day: "Descanso",
  holiday: "Feriado",
  time_off: "Ausência",
  unscheduled: "Sem jornada",
  not_employed: "Fora do contrato",
} as const satisfies Record<TimesheetDayKind, string>;
