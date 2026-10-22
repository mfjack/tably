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
