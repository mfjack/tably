import type { TimesheetDayKind } from "./timesheet";
import type { TimeOffKind } from "./types";

export const TIME_OFF_KIND_LABELS = {
  medical_certificate: "Atestado médico",
  vacation: "Férias",
  day_off: "Folga",
  justified_absence: "Falta justificada",
} as const satisfies Record<TimeOffKind, string>;

export const TIMESHEET_DAY_KIND_LABELS = {
  workday: "Dia útil",
  rest_day: "Descanso",
  holiday: "Feriado",
  time_off: "Ausência",
  unscheduled: "Sem jornada",
  not_employed: "Fora do contrato",
} as const satisfies Record<TimesheetDayKind, string>;
