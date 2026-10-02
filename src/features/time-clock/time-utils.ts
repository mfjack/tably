import { format, getDaysInMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

export function isMonthKey(value: string): boolean {
  return MONTH_KEY_PATTERN.test(value);
}

export function parseMonthKey(rawValue: string): string | null {
  return isMonthKey(rawValue) ? rawValue : null;
}

export function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function getMonthStart(monthKey: string): string {
  return `${monthKey}-01`;
}

export function getMonthEnd(monthKey: string): string {
  const days = getDaysInMonth(parseISO(getMonthStart(monthKey)));
  return `${monthKey}-${days.toString().padStart(2, "0")}`;
}

export function getMonthDates(monthKey: string): string[] {
  const days = getDaysInMonth(parseISO(getMonthStart(monthKey)));
  return Array.from(
    { length: days },
    (_, index) => `${monthKey}-${(index + 1).toString().padStart(2, "0")}`,
  );
}

export function shiftMonthKey(monthKey: string, offset: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string): string {
  const label = format(parseISO(getMonthStart(monthKey)), "MMMM 'de' yyyy", {
    locale: ptBR,
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getIsoWeekday(date: string): number {
  const weekday = parseISO(date).getDay();
  return weekday === 0 ? 7 : weekday;
}

export function getDayDifference(fromDate: string, toDate: string): number {
  const [fromYear, fromMonth, fromDay] = fromDate.split("-").map(Number);
  const [toYear, toMonth, toDay] = toDate.split("-").map(Number);
  const millisecondsPerDay = MINUTES_PER_DAY * 60 * 1000;
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) -
      Date.UTC(fromYear, fromMonth - 1, fromDay)) /
      millisecondsPerDay,
  );
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

function getZonedFormatter(timeZone: string) {
  const cachedFormatter = zonedFormatters.get(timeZone);
  if (cachedFormatter) return cachedFormatter;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  zonedFormatters.set(timeZone, formatter);
  return formatter;
}

export type ZonedParts = {
  date: string;
  time: string;
  seconds: string;
  minutes: number;
};

export function getZonedParts(isoDate: string, timeZone: string): ZonedParts {
  const parts = Object.fromEntries(
    getZonedFormatter(timeZone)
      .formatToParts(new Date(isoDate))
      .map((part) => [part.type, part.value]),
  );
  const time = `${parts.hour}:${parts.minute}`;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time,
    seconds: parts.second,
    minutes: timeToMinutes(time),
  };
}

export function zonedDateTimeToIso(
  date: string,
  time: string,
  timeZone: string,
): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes);
  const zoned = getZonedParts(new Date(utcGuess).toISOString(), timeZone);
  const zonedAsUtc = Date.UTC(
    Number(zoned.date.slice(0, 4)),
    Number(zoned.date.slice(5, 7)) - 1,
    Number(zoned.date.slice(8, 10)),
    Math.floor(zoned.minutes / MINUTES_PER_HOUR),
    zoned.minutes % MINUTES_PER_HOUR,
  );
  return new Date(utcGuess - (zonedAsUtc - utcGuess)).toISOString();
}

export function formatMinutes(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : "";
  const absoluteMinutes = Math.abs(Math.round(totalMinutes));
  const hours = Math.floor(absoluteMinutes / MINUTES_PER_HOUR);
  const minutes = absoluteMinutes % MINUTES_PER_HOUR;
  return `${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function formatSignedMinutes(totalMinutes: number): string {
  return totalMinutes > 0
    ? `+${formatMinutes(totalMinutes)}`
    : formatMinutes(totalMinutes);
}
