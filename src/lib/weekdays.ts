const WEEKDAY_LABELS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;

const WEEKDAY_SHORT_LABELS = [
  "seg",
  "ter",
  "qua",
  "qui",
  "sex",
  "sáb",
  "dom",
] as const;

export const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((label, index) => ({
  value: String(index + 1),
  label,
}));

export function getWeekdayLabel(isoWeekday: number): string {
  return WEEKDAY_LABELS[isoWeekday - 1] ?? "";
}

export function getWeekdayShortLabel(isoWeekday: number): string {
  return WEEKDAY_SHORT_LABELS[isoWeekday - 1] ?? "";
}
