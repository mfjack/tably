import {
  addDays,
  format,
  getDate,
  getDaysInMonth,
  getISODay,
  parseISO,
  setDate,
  startOfISOWeek,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Task, TaskFrequency } from "./types";

const DATE_KEY_FORMAT = "yyyy-MM-dd";

export const TASK_FREQUENCY_LABELS = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
} as const satisfies Record<TaskFrequency, string>;

export const WEEKDAY_OPTIONS = [
  { value: "1", label: "Segunda" },
  { value: "2", label: "Terça" },
  { value: "3", label: "Quarta" },
  { value: "4", label: "Quinta" },
  { value: "5", label: "Sexta" },
  { value: "6", label: "Sábado" },
  { value: "7", label: "Domingo" },
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

export function getPeriodStart(frequency: TaskFrequency, today: string) {
  const day = parseISO(today);
  if (frequency === "daily") return today;
  if (frequency === "weekly") {
    return format(startOfISOWeek(day), DATE_KEY_FORMAT);
  }
  return format(startOfMonth(day), DATE_KEY_FORMAT);
}

function getDueDate(task: Task, today: string): Date | null {
  const day = parseISO(today);
  if (task.frequency === "weekly" && task.dueWeekday) {
    return addDays(startOfISOWeek(day), task.dueWeekday - 1);
  }
  if (task.frequency === "monthly" && task.dueDay) {
    return setDate(day, Math.min(task.dueDay, getDaysInMonth(day)));
  }
  return null;
}

export function isTaskOverdue(task: Task, today: string): boolean {
  if (task.completion) return false;
  const dueDate = getDueDate(task, today);
  return dueDate !== null && parseISO(today) > dueDate;
}

export function getScheduleLabel(task: Task): string {
  if (task.frequency === "weekly") {
    return task.dueWeekday
      ? `Semanal · ${WEEKDAY_SHORT_LABELS[task.dueWeekday - 1]}`
      : "Semanal";
  }
  if (task.frequency === "monthly") {
    return task.dueDay ? `Mensal · dia ${task.dueDay}` : "Mensal";
  }
  return TASK_FREQUENCY_LABELS.daily;
}

export function getCompletionDayLabel(
  task: Task,
  today: string,
): string | null {
  if (!task.completion || task.completion.completedOn === today) return null;
  const completedOn = parseISO(task.completion.completedOn);
  return task.frequency === "monthly"
    ? `dia ${getDate(completedOn)}`
    : format(completedOn, "EEE", { locale: ptBR });
}

export function getWeekdayOfToday(today: string) {
  return getISODay(parseISO(today));
}
