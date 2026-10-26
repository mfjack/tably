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

function formatHour(time: string): string {
  const [hours, minutes] = time.split(":");
  return `${Number(hours)}h${minutes === "00" ? "" : minutes}`;
}

function describeOpeningDay(daysAhead: number, weekday: number): string {
  if (daysAhead === 0) return "hoje";
  if (daysAhead === 1) return "amanhã";
  return getWeekdayLabel(weekday).toLowerCase();
}

const MINUTE_IN_MS = 60_000;
const OPENING_COUNTDOWN_LIMIT_IN_MINUTES = 24 * 60;
const CLOSING_COUNTDOWN_LIMIT_IN_MINUTES = 60;

export type OpeningStatusSummary = {
  isOpen: boolean;
  label: string;
  nextChangeAt: Date | null;
};

function getMinutesUntil(moment: string | null | undefined, now: Date) {
  if (!moment) return null;
  return Math.ceil((new Date(moment).getTime() - now.getTime()) / MINUTE_IN_MS);
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`;
}

function toDate(moment: string | null | undefined): Date | null {
  return moment ? new Date(moment) : null;
}

export function summarizeOpeningStatus(
  status: OpeningStatus,
  now: Date,
): OpeningStatusSummary | null {
  if (!status.isConfigured) return null;

  if (status.isOpen) {
    const minutesUntilClosing = getMinutesUntil(status.closesAtMoment, now);
    const label =
      minutesUntilClosing !== null &&
      minutesUntilClosing > 0 &&
      minutesUntilClosing <= CLOSING_COUNTDOWN_LIMIT_IN_MINUTES
        ? `Aberto · fecha em ${formatDuration(minutesUntilClosing)}`
        : status.closesAt
          ? `Aberto agora · fecha às ${formatHour(status.closesAt)}`
          : "Aberto agora";
    return { isOpen: true, label, nextChangeAt: toDate(status.closesAtMoment) };
  }

  if (!status.nextOpening) {
    return { isOpen: false, label: "Fechado agora", nextChangeAt: null };
  }

  const { daysAhead, weekday, opensAt, moment } = status.nextOpening;
  const minutesUntilOpening = getMinutesUntil(moment, now);
  const label =
    minutesUntilOpening !== null &&
    minutesUntilOpening > 0 &&
    minutesUntilOpening <= OPENING_COUNTDOWN_LIMIT_IN_MINUTES
      ? `Fechado · abre em ${formatDuration(minutesUntilOpening)}`
      : `Fechado agora · abrimos ${describeOpeningDay(daysAhead, weekday)} às ${formatHour(opensAt)}`;
  return { isOpen: false, label, nextChangeAt: toDate(moment) };
}
