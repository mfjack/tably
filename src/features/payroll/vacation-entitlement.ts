import {
  addDays,
  addMonths,
  differenceInCalendarMonths,
  format,
  parseISO,
} from "date-fns";

export const FULL_VACATION_DAYS = 30;
const MONTHS_PER_PERIOD = 12;

export type AcquisitionPeriod = {
  start: string;
  end: string;
  concessionDeadline: string;
  daysUsed: number;
  daysAvailable: number;
  isOverdue: boolean;
};

export type VacationEntitlement =
  | { status: "accruing"; entitledFrom: string }
  | { status: "entitled"; periods: AcquisitionPeriod[] };

export type UsedVacation = {
  acquisitionStart: string;
  days: number;
  soldDays: number;
};

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getVacationEntitlement(
  admissionDate: string,
  today: string,
  usedVacations: readonly UsedVacation[],
): VacationEntitlement {
  const admission = parseISO(admissionDate);
  let completedPeriods = Math.floor(
    differenceInCalendarMonths(parseISO(today), admission) / MONTHS_PER_PERIOD,
  );
  if (
    completedPeriods > 0 &&
    toDateKey(addMonths(admission, completedPeriods * MONTHS_PER_PERIOD)) >
      today
  ) {
    completedPeriods--;
  }

  if (completedPeriods <= 0) {
    return {
      status: "accruing",
      entitledFrom: toDateKey(addMonths(admission, MONTHS_PER_PERIOD)),
    };
  }

  const periods: AcquisitionPeriod[] = [];
  for (let period = 1; period <= completedPeriods; period++) {
    const start = toDateKey(
      addMonths(admission, (period - 1) * MONTHS_PER_PERIOD),
    );
    const end = toDateKey(
      addDays(addMonths(admission, period * MONTHS_PER_PERIOD), -1),
    );
    const concessionDeadline = toDateKey(
      addDays(addMonths(admission, (period + 1) * MONTHS_PER_PERIOD), -1),
    );
    const daysUsed = usedVacations
      .filter((vacation) => vacation.acquisitionStart === start)
      .reduce(
        (total, vacation) => total + vacation.days + vacation.soldDays,
        0,
      );
    const daysAvailable = Math.max(0, FULL_VACATION_DAYS - daysUsed);
    periods.push({
      start,
      end,
      concessionDeadline,
      daysUsed,
      daysAvailable,
      isOverdue: daysAvailable > 0 && concessionDeadline < today,
    });
  }

  return {
    status: "entitled",
    periods: periods.filter((period) => period.daysAvailable > 0),
  };
}
