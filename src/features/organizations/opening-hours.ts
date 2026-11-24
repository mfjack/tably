import * as z from "zod";
import { TIME_OF_DAY_PATTERN } from "@/lib/time-of-day";
import { getWeekdayLabel, ISO_WEEKDAYS } from "@/lib/weekdays";

export const openingHourSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  opensAt: z.string().regex(TIME_OF_DAY_PATTERN),
  closesAt: z.string().regex(TIME_OF_DAY_PATTERN),
});

export type OpeningHour = z.infer<typeof openingHourSchema>;

export const openingStatusSchema = z.object({
  isConfigured: z.boolean(),
  isOpen: z.boolean(),
  closesAt: z.string().nullable().optional(),
  closesAtMoment: z.string().nullable().optional(),
  nextOpening: z
    .object({
      daysAhead: z.number(),
      weekday: z.number(),
      opensAt: z.string(),
      moment: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export type OpeningStatus = z.infer<typeof openingStatusSchema>;

export type OpeningDay = {
  weekday: number;
  isOpen: boolean;
  opensAt: string;
  breakStartsAt: string;
  breakEndsAt: string;
  closesAt: string;
};

export function toOpeningDays(hours: readonly OpeningHour[]): OpeningDay[] {
  return ISO_WEEKDAYS.map((weekday) => {
    const periods = hours
      .filter((hour) => hour.weekday === weekday)
      .sort((first, second) => first.opensAt.localeCompare(second.opensAt));
    const [morning, afternoon] = periods;
    const hasBreak = afternoon !== undefined;
    return {
      weekday,
      isOpen: morning !== undefined,
      opensAt: morning?.opensAt ?? "",
      breakStartsAt: hasBreak ? (morning?.closesAt ?? "") : "",
      breakEndsAt: afternoon?.opensAt ?? "",
      closesAt: (afternoon ?? morning)?.closesAt ?? "",
    };
  });
}

export function toOpeningHours(days: readonly OpeningDay[]): OpeningHour[] {
  return days
    .filter((day) => day.isOpen)
    .flatMap(({ weekday, opensAt, breakStartsAt, breakEndsAt, closesAt }) =>
      breakStartsAt && breakEndsAt
        ? [
            { weekday, opensAt, closesAt: breakStartsAt },
            { weekday, opensAt: breakEndsAt, closesAt },
          ]
        : [{ weekday, opensAt, closesAt }],
    );
}

export function parseOpeningHours(value: unknown): OpeningHour[] {
  const parsedHours = z.array(openingHourSchema).safeParse(value);
  return parsedHours.success ? parsedHours.data : [];
}

export type OpeningStatusSummary = {
  isOpen: boolean;
  label: string;
  nextChangeAt: Date | null;
};

function toDate(moment: string | null | undefined): Date | null {
  return moment ? new Date(moment) : null;
}

function formatHour(time: string): string {
  const [hours, minutes] = time.split(":");
  return minutes && minutes !== "00" ? `${hours}h${minutes}` : `${hours}h`;
}

function formatHourRange(opensAt: string, closesAt: string): string {
  return `${formatHour(opensAt)} - ${formatHour(closesAt)}`;
}

function describeNextOpening(
  nextOpening: NonNullable<OpeningStatus["nextOpening"]>,
): string {
  const opensAt = formatHour(nextOpening.opensAt);
  if (nextOpening.daysAhead === 0) return `abre às ${opensAt}`;
  if (nextOpening.daysAhead === 1) return `abre amanhã às ${opensAt}`;
  return `abre ${getWeekdayLabel(nextOpening.weekday).toLocaleLowerCase("pt-BR")} às ${opensAt}`;
}

export function describeOpeningStatus(status: OpeningStatus): string | null {
  if (!status.isConfigured) return null;
  if (status.isOpen) {
    return status.closesAt ? `até ${formatHour(status.closesAt)}` : null;
  }
  return status.nextOpening ? describeNextOpening(status.nextOpening) : null;
}

export function formatOpeningDay(day: OpeningDay): string {
  if (!day.isOpen) return "Fechado";
  return day.breakStartsAt && day.breakEndsAt
    ? `${formatHourRange(day.opensAt, day.breakStartsAt)} / ${formatHourRange(day.breakEndsAt, day.closesAt)}`
    : formatHourRange(day.opensAt, day.closesAt);
}

export function summarizeOpeningStatus(
  status: OpeningStatus,
): OpeningStatusSummary | null {
  if (!status.isConfigured) return null;
  if (status.isOpen) {
    return {
      isOpen: true,
      label: "Aberto",
      nextChangeAt: toDate(status.closesAtMoment),
    };
  }
  return {
    isOpen: false,
    label: "Fechado",
    nextChangeAt: toDate(status.nextOpening?.moment),
  };
}
