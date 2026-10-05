import { addDays, format, parseISO } from "date-fns";
import {
  getIsoWeekday,
  getMonthEnd,
  getMonthStart,
  shiftMonthKey,
} from "@/features/time-clock/time-utils";
import type { SalaryPaymentSchedule } from "./types";

const WEEKEND_DAYS: readonly number[] = [6, 7];
const BUSINESS_DAY_LIMIT = 5;

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function isBusinessDay(date: string, holidays: ReadonlySet<string>): boolean {
  return !WEEKEND_DAYS.includes(getIsoWeekday(date)) && !holidays.has(date);
}

function moveBackToBusinessDay(
  date: string,
  holidays: ReadonlySet<string>,
): string {
  let current = date;
  while (!isBusinessDay(current, holidays)) {
    current = toDateKey(addDays(parseISO(current), -1));
  }
  return current;
}

function getFifthBusinessDay(
  monthKey: string,
  holidays: ReadonlySet<string>,
): string {
  let current = getMonthStart(monthKey);
  let businessDays = isBusinessDay(current, holidays) ? 1 : 0;
  while (businessDays < BUSINESS_DAY_LIMIT) {
    current = toDateKey(addDays(parseISO(current), 1));
    if (isBusinessDay(current, holidays)) businessDays += 1;
  }
  return current;
}

export function getSalaryPaymentMonths(monthKey: string): string[] {
  return [monthKey, shiftMonthKey(monthKey, 1)];
}

export function getSalaryPaymentDate(
  monthKey: string,
  schedule: SalaryPaymentSchedule,
  holidays: ReadonlySet<string>,
): string {
  const nextMonthKey = shiftMonthKey(monthKey, 1);

  if (schedule.rule === "fifth_business_day") {
    return getFifthBusinessDay(nextMonthKey, holidays);
  }
  if (schedule.rule === "last_day") {
    return moveBackToBusinessDay(getMonthEnd(monthKey), holidays);
  }

  const paymentMonthKey = schedule.isNextMonth ? nextMonthKey : monthKey;
  const lastDay = Number(getMonthEnd(paymentMonthKey).slice(-2));
  const day = Math.min(schedule.day ?? lastDay, lastDay);
  return moveBackToBusinessDay(
    `${paymentMonthKey}-${day.toString().padStart(2, "0")}`,
    holidays,
  );
}
