import { MINUTES_PER_HOUR } from "@/features/time-clock/time-utils";
import { getWeeklyMinutes } from "@/features/time-clock/timesheet";
import { formatQuantity } from "@/lib/format";
import type { WorkSchedule, WorkScheduleDay } from "./types";

export const WEEKDAY_LABELS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;

export const WEEKDAY_SHORT_LABELS = [
  "seg",
  "ter",
  "qua",
  "qui",
  "sex",
  "sáb",
  "dom",
] as const;

export function getWeekdayLabel(weekday: number): string {
  return WEEKDAY_LABELS[weekday - 1] ?? "";
}

export function getWeekdayShortLabel(weekday: number): string {
  return WEEKDAY_SHORT_LABELS[weekday - 1] ?? "";
}

export function describeScheduleDay(day: WorkScheduleDay): string {
  return day.breakStartTime && day.breakEndTime
    ? `${day.startTime}–${day.breakStartTime} · ${day.breakEndTime}–${day.endTime}`
    : `${day.startTime}–${day.endTime}`;
}

export function describeWorkSchedule(schedule: WorkSchedule): string {
  const weekdays = schedule.days
    .map((day) => getWeekdayShortLabel(day.weekday))
    .join(", ");
  return `${weekdays} · ${formatQuantity(getWeeklyMinutes(schedule) / MINUTES_PER_HOUR)}h por semana`;
}
