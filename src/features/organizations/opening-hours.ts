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
  nextOpening: z
    .object({
      daysAhead: z.number(),
      weekday: z.number(),
      opensAt: z.string(),
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

export function describeOpeningStatus(status: OpeningStatus): string | null {
  if (!status.isConfigured) return null;
  if (status.isOpen) {
    return status.closesAt
      ? `Aberto agora · fecha às ${formatHour(status.closesAt)}`
      : "Aberto agora";
  }
  if (!status.nextOpening) return "Fechado agora";
  const { daysAhead, weekday, opensAt } = status.nextOpening;
  return `Fechado agora · abrimos ${describeOpeningDay(daysAhead, weekday)} às ${formatHour(opensAt)}`;
}
