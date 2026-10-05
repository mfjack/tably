import type { WorkScheduleDay } from "@/features/employees/types";
import { MINUTES_PER_DAY, MINUTES_PER_HOUR, timeToMinutes } from "./time-utils";
import type { TimesheetDay, TimesheetPunch } from "./timesheet";

const EARLY_MORNING_LIMIT = 6 * MINUTES_PER_HOUR;
const EVENING_START = 18 * MINUTES_PER_HOUR;
const SHIFT_START_TOLERANCE = 2 * MINUTES_PER_HOUR;

export const EXTRA_SLOT_LABEL = "Outro horário";

export type DayAdjustmentSlot = {
  label: string;
  expectedTime: string | null;
};

type ExpectedSlot = DayAdjustmentSlot & { minutes: number | null };

function crossesMidnight(schedule: WorkScheduleDay): boolean {
  return timeToMinutes(schedule.endTime) < timeToMinutes(schedule.startTime);
}

function toScheduleMinutes(time: string, schedule: WorkScheduleDay): number {
  const minutes = timeToMinutes(time);
  return crossesMidnight(schedule) &&
    minutes < timeToMinutes(schedule.startTime)
    ? minutes + MINUTES_PER_DAY
    : minutes;
}

function getExpectedSlots(schedule: WorkScheduleDay | null): ExpectedSlot[] {
  if (!schedule) {
    return [
      "Entrada",
      "Saída para o intervalo",
      "Volta do intervalo",
      "Saída",
    ].map((label) => ({ label, expectedTime: null, minutes: null }));
  }

  const slots: DayAdjustmentSlot[] = [
    { label: "Entrada", expectedTime: schedule.startTime },
    ...(schedule.breakStartTime && schedule.breakEndTime
      ? [
          {
            label: "Saída para o intervalo",
            expectedTime: schedule.breakStartTime,
          },
          { label: "Volta do intervalo", expectedTime: schedule.breakEndTime },
        ]
      : []),
    { label: "Saída", expectedTime: schedule.endTime },
  ];
  return slots.map((slot) => ({
    ...slot,
    minutes: slot.expectedTime
      ? toScheduleMinutes(slot.expectedTime, schedule)
      : null,
  }));
}

function getPunchMinutes(punch: TimesheetPunch): number {
  return (
    timeToMinutes(punch.localTime) + (punch.isNextDay ? MINUTES_PER_DAY : 0)
  );
}

export function getValidPunches(day: TimesheetDay): TimesheetPunch[] {
  return day.punches.filter((punch) => punch.voiding === null);
}

export function getMissingSlots(day: TimesheetDay): DayAdjustmentSlot[] {
  const expectedSlots = getExpectedSlots(day.schedule);
  const validPunches = getValidPunches(day);

  if (!day.schedule) {
    return expectedSlots
      .slice(validPunches.length)
      .map(({ label, expectedTime }) => ({ label, expectedTime }));
  }

  const remainingSlots = [...expectedSlots];
  for (const punch of validPunches) {
    if (remainingSlots.length === 0) break;
    const punchMinutes = getPunchMinutes(punch);
    let closestIndex = 0;
    remainingSlots.forEach((slot, index) => {
      const distance = Math.abs((slot.minutes ?? 0) - punchMinutes);
      const closestDistance = Math.abs(
        (remainingSlots[closestIndex].minutes ?? 0) - punchMinutes,
      );
      if (distance < closestDistance) closestIndex = index;
    });
    remainingSlots.splice(closestIndex, 1);
  }

  return remainingSlots.map(({ label, expectedTime }) => ({
    label,
    expectedTime,
  }));
}

export function isNextDayTime(
  time: string,
  schedule: WorkScheduleDay | null,
  dayTimes: readonly string[],
): boolean {
  const minutes = timeToMinutes(time);
  if (schedule) {
    return (
      crossesMidnight(schedule) &&
      minutes < timeToMinutes(schedule.startTime) - SHIFT_START_TOLERANCE
    );
  }
  return (
    minutes < EARLY_MORNING_LIMIT &&
    dayTimes.some((dayTime) => timeToMinutes(dayTime) >= EVENING_START)
  );
}
