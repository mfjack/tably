import {
  formatClockTime,
  MINUTES_PER_HOUR,
} from "@/features/time-clock/time-utils";
import { getWeeklyMinutes } from "@/features/time-clock/timesheet";
import { formatQuantity } from "@/lib/format";
import { getWeekdayShortLabel } from "@/lib/weekdays";
import type { WorkSchedule, WorkScheduleDay } from "./types";

export function describeScheduleDay(day: WorkScheduleDay): string {
  const start = formatClockTime(day.startTime);
  const end = formatClockTime(day.endTime);
  return day.breakStartTime && day.breakEndTime
    ? `${start}–${formatClockTime(day.breakStartTime)} · ${formatClockTime(day.breakEndTime)}–${end}`
    : `${start}–${end}`;
}

export function describeWorkSchedule(schedule: WorkSchedule): string {
  const weekdays = schedule.days
    .map((day) => getWeekdayShortLabel(day.weekday))
    .join(", ");
  return `${weekdays} · ${formatQuantity(getWeeklyMinutes(schedule) / MINUTES_PER_HOUR)}h por semana`;
}
