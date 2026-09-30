import { format, parseISO, startOfISOWeek } from "date-fns";
import type {
  Employee,
  Holiday,
  WorkSchedule,
  WorkScheduleDay,
} from "@/features/employees/types";
import {
  getDayDifference,
  getIsoWeekday,
  getMonthDates,
  getZonedParts,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  timeToMinutes,
} from "./time-utils";
import type { TimeOff, TimeOffKind, TimePunch } from "./types";

const FULL_BREAK_WORK_THRESHOLD = 6 * MINUTES_PER_HOUR;
const SHORT_BREAK_WORK_THRESHOLD = 4 * MINUTES_PER_HOUR;
const FULL_BREAK_MINUTES = 60;
const SHORT_BREAK_MINUTES = 15;
const MIN_REST_BETWEEN_SHIFTS = 11 * MINUTES_PER_HOUR;
const NIGHT_WINDOWS = [
  [0, 5 * MINUTES_PER_HOUR],
  [22 * MINUTES_PER_HOUR, 29 * MINUTES_PER_HOUR],
  [46 * MINUTES_PER_HOUR, 53 * MINUTES_PER_HOUR],
] as const;
const SUNDAY = 7;
const DEFAULT_MONTHLY_HOURS = 220;
const WEEKS_PER_MONTH_FACTOR = 5;

export type TimesheetDayKind =
  | "workday"
  | "rest_day"
  | "holiday"
  | "time_off"
  | "unscheduled"
  | "not_employed";

export type TimesheetPunch = TimePunch & {
  localTime: string;
  localSeconds: string;
  isNextDay: boolean;
};

export type TimesheetDay = {
  date: string;
  weekday: number;
  kind: TimesheetDayKind;
  holidayName: string | null;
  timeOffKind: TimeOffKind | null;
  isPending: boolean;
  schedule: WorkScheduleDay | null;
  punches: TimesheetPunch[];
  expectedMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  nightMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  restDayWorkedMinutes: number;
  shortfallMinutes: number;
  isAbsence: boolean;
  breakShortfallMinutes: number;
  hasOddPunches: boolean;
  hasShortRest: boolean;
  balanceMinutes: number;
};

export type TimesheetSummary = {
  expectedMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  restDayWorkedMinutes: number;
  shortfallMinutes: number;
  absenceDays: number;
  absenceMinutes: number;
  lostRestDays: number;
  nightMinutes: number;
  breakShortfallMinutes: number;
  balanceMinutes: number;
  lateDays: number;
  inconsistentDays: number;
  businessDays: number;
  restDays: number;
  monthlyHours: number;
  vacationDays: number;
};

export type Timesheet = {
  days: TimesheetDay[];
  summary: TimesheetSummary;
};

export type TimesheetInput = {
  monthKey: string;
  today: string;
  timeZone: string;
  employee: Pick<Employee, "admissionDate" | "terminationDate">;
  schedule: WorkSchedule | null;
  punches: TimePunch[];
  timeOff: TimeOff[];
  holidays: Holiday[];
  previousDayLastPunchAt?: string | null;
};

type ScheduleWindow = {
  start: number;
  end: number;
  breakStart: number | null;
  breakEnd: number | null;
};

function toScheduleWindow(day: WorkScheduleDay): ScheduleWindow {
  const start = timeToMinutes(day.startTime);
  const shiftAfterStart = (time: string) => {
    const minutes = timeToMinutes(time);
    return minutes <= start ? minutes + MINUTES_PER_DAY : minutes;
  };
  return {
    start,
    end: shiftAfterStart(day.endTime),
    breakStart: day.breakStartTime ? shiftAfterStart(day.breakStartTime) : null,
    breakEnd: day.breakEndTime ? shiftAfterStart(day.breakEndTime) : null,
  };
}

function getExpectedMinutes(window: ScheduleWindow): number {
  const breakMinutes =
    window.breakStart !== null && window.breakEnd !== null
      ? window.breakEnd - window.breakStart
      : 0;
  return window.end - window.start - breakMinutes;
}

export function getWeeklyMinutes(schedule: WorkSchedule | null): number {
  if (!schedule) return 0;
  return schedule.days.reduce(
    (total, day) => total + getExpectedMinutes(toScheduleWindow(day)),
    0,
  );
}

export function getMonthlyHours(schedule: WorkSchedule | null): number {
  const weeklyMinutes = getWeeklyMinutes(schedule);
  if (weeklyMinutes === 0) return DEFAULT_MONTHLY_HOURS;
  return (weeklyMinutes / MINUTES_PER_HOUR) * WEEKS_PER_MONTH_FACTOR;
}

function getOverlap(start: number, end: number, from: number, to: number) {
  return Math.max(0, Math.min(end, to) - Math.max(start, from));
}

function getNightMinutes(pairs: readonly (readonly [number, number])[]) {
  return pairs.reduce(
    (total, [start, end]) =>
      total +
      NIGHT_WINDOWS.reduce(
        (windowTotal, [from, to]) =>
          windowTotal + getOverlap(start, end, from, to),
        0,
      ),
    0,
  );
}

function getRequiredBreakMinutes(workedMinutes: number): number {
  if (workedMinutes > FULL_BREAK_WORK_THRESHOLD) return FULL_BREAK_MINUTES;
  if (workedMinutes > SHORT_BREAK_WORK_THRESHOLD) return SHORT_BREAK_MINUTES;
  return 0;
}

function toTimesheetPunch(
  punch: TimePunch,
  timeZone: string,
): TimesheetPunch & { minutes: number } {
  const zoned = getZonedParts(punch.punchedAt, timeZone);
  const dayOffset = getDayDifference(punch.workDate, zoned.date);
  return {
    ...punch,
    localTime: zoned.time,
    localSeconds: zoned.seconds,
    isNextDay: dayOffset > 0,
    minutes: dayOffset * MINUTES_PER_DAY + zoned.minutes,
  };
}

function findTimeOff(timeOff: readonly TimeOff[], date: string) {
  return (
    timeOff.find((entry) => entry.startDate <= date && entry.endDate >= date) ??
    null
  );
}

function isEmployed(
  employee: TimesheetInput["employee"],
  date: string,
): boolean {
  return (
    employee.admissionDate <= date &&
    (employee.terminationDate === null || employee.terminationDate >= date)
  );
}

function createEmptyDay(
  date: string,
  kind: TimesheetDayKind,
  punches: TimesheetPunch[],
): TimesheetDay {
  return {
    date,
    weekday: getIsoWeekday(date),
    kind,
    holidayName: null,
    timeOffKind: null,
    isPending: false,
    schedule: null,
    punches,
    expectedMinutes: 0,
    workedMinutes: 0,
    breakMinutes: 0,
    nightMinutes: 0,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    overtimeMinutes: 0,
    restDayWorkedMinutes: 0,
    shortfallMinutes: 0,
    isAbsence: false,
    breakShortfallMinutes: 0,
    hasOddPunches: false,
    hasShortRest: false,
    balanceMinutes: 0,
  };
}

export function buildTimesheet(input: TimesheetInput): Timesheet {
  const holidaysByDate = new Map(
    input.holidays.map((holiday) => [holiday.date, holiday.name]),
  );
  const scheduleByWeekday = new Map(
    (input.schedule?.days ?? []).map((day) => [day.weekday, day]),
  );
  const markTolerance = input.schedule?.markToleranceMinutes ?? 0;
  const dailyTolerance = input.schedule?.dailyToleranceMinutes ?? 0;
  const punchesByDate = new Map<
    string,
    ReturnType<typeof toTimesheetPunch>[]
  >();

  for (const punch of input.punches) {
    const timesheetPunch = toTimesheetPunch(punch, input.timeZone);
    const datePunches = punchesByDate.get(punch.workDate) ?? [];
    datePunches.push(timesheetPunch);
    punchesByDate.set(punch.workDate, datePunches);
  }

  let previousShiftEnd = input.previousDayLastPunchAt
    ? new Date(input.previousDayLastPunchAt).getTime()
    : null;

  const days = getMonthDates(input.monthKey).map((date): TimesheetDay => {
    const allPunches = (punchesByDate.get(date) ?? []).sort(
      (first, second) => first.minutes - second.minutes,
    );
    const validPunches = allPunches.filter((punch) => !punch.voiding);
    const weekday = getIsoWeekday(date);

    if (!isEmployed(input.employee, date)) {
      return createEmptyDay(date, "not_employed", allPunches);
    }

    const holidayName = holidaysByDate.get(date) ?? null;
    const timeOff = findTimeOff(input.timeOff, date);
    const scheduleDay = scheduleByWeekday.get(weekday) ?? null;
    const kind: TimesheetDayKind = timeOff
      ? "time_off"
      : holidayName
        ? "holiday"
        : !input.schedule
          ? "unscheduled"
          : scheduleDay
            ? "workday"
            : "rest_day";
    const day = createEmptyDay(date, kind, allPunches);
    day.holidayName = holidayName;
    day.timeOffKind = timeOff?.kind ?? null;
    day.schedule = kind === "workday" ? scheduleDay : null;
    day.isPending = date >= input.today;

    const pairs: [number, number][] = [];
    for (let index = 0; index + 1 < validPunches.length; index += 2) {
      pairs.push([
        validPunches[index].minutes,
        validPunches[index + 1].minutes,
      ]);
    }
    day.hasOddPunches = validPunches.length % 2 === 1 && !day.isPending;
    day.workedMinutes = pairs.reduce(
      (total, [start, end]) => total + (end - start),
      0,
    );
    day.breakMinutes = pairs
      .slice(1)
      .reduce((total, [start], index) => total + (start - pairs[index][1]), 0);
    day.nightMinutes = getNightMinutes(pairs);

    const requiredBreak = getRequiredBreakMinutes(day.workedMinutes);
    day.breakShortfallMinutes =
      pairs.length > 0 ? Math.max(0, requiredBreak - day.breakMinutes) : 0;

    const firstPunch = validPunches[0];
    if (firstPunch) {
      const firstPunchTime = new Date(firstPunch.punchedAt).getTime();
      day.hasShortRest =
        previousShiftEnd !== null &&
        (firstPunchTime - previousShiftEnd) / 60000 < MIN_REST_BETWEEN_SHIFTS;
    }
    const lastPairedPunch = validPunches[pairs.length * 2 - 1];
    if (lastPairedPunch) {
      previousShiftEnd = new Date(lastPairedPunch.punchedAt).getTime();
    }

    if (kind === "workday" && scheduleDay) {
      const window = toScheduleWindow(scheduleDay);
      day.expectedMinutes = getExpectedMinutes(window);

      if (firstPunch) {
        const late = firstPunch.minutes - window.start;
        day.lateMinutes = late > markTolerance ? late : 0;
      }
      if (lastPairedPunch && validPunches.length % 2 === 0) {
        const earlyLeave = window.end - lastPairedPunch.minutes;
        day.earlyLeaveMinutes = earlyLeave > markTolerance ? earlyLeave : 0;
      }

      if (!day.isPending) {
        if (validPunches.length === 0) {
          day.isAbsence = true;
          day.balanceMinutes = -day.expectedMinutes;
        } else {
          const difference = day.workedMinutes - day.expectedMinutes;
          day.balanceMinutes =
            Math.abs(difference) <= dailyTolerance ? 0 : difference;
          day.overtimeMinutes = Math.max(0, day.balanceMinutes);
          day.shortfallMinutes = Math.max(0, -day.balanceMinutes);
        }
      }
    } else if ((kind === "rest_day" || kind === "holiday") && !day.isPending) {
      day.restDayWorkedMinutes = day.workedMinutes;
      day.balanceMinutes = day.workedMinutes;
    }

    return day;
  });

  const monthDates = getMonthDates(input.monthKey);
  const restDays = monthDates.filter(
    (date) => getIsoWeekday(date) === SUNDAY || holidaysByDate.has(date),
  ).length;
  const absenceWeeks = new Set(
    days
      .filter((day) => day.isAbsence)
      .map((day) => format(startOfISOWeek(parseISO(day.date)), "yyyy-MM-dd")),
  );

  const sum = (selector: (day: TimesheetDay) => number) =>
    days.reduce((total, day) => total + selector(day), 0);

  return {
    days,
    summary: {
      expectedMinutes: sum((day) => day.expectedMinutes),
      workedMinutes: sum((day) => day.workedMinutes),
      overtimeMinutes: sum((day) => day.overtimeMinutes),
      restDayWorkedMinutes: sum((day) => day.restDayWorkedMinutes),
      shortfallMinutes: sum((day) => day.shortfallMinutes),
      absenceDays: days.filter((day) => day.isAbsence).length,
      absenceMinutes: sum((day) => (day.isAbsence ? day.expectedMinutes : 0)),
      lostRestDays: absenceWeeks.size,
      nightMinutes: sum((day) => day.nightMinutes),
      breakShortfallMinutes: sum((day) => day.breakShortfallMinutes),
      balanceMinutes: sum((day) => day.balanceMinutes),
      lateDays: days.filter((day) => day.lateMinutes > 0).length,
      inconsistentDays: days.filter((day) => day.hasOddPunches).length,
      businessDays: monthDates.length - restDays,
      restDays,
      monthlyHours: getMonthlyHours(input.schedule),
      vacationDays: days.filter(
        (day) => day.kind === "time_off" && day.timeOffKind === "vacation",
      ).length,
    },
  };
}
