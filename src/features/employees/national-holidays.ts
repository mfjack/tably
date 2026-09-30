import { addDays, format } from "date-fns";
import type { HolidayInput } from "./schemas";

const FIXED_NATIONAL_HOLIDAYS = [
  { monthDay: "01-01", name: "Confraternização Universal" },
  { monthDay: "04-21", name: "Tiradentes" },
  { monthDay: "05-01", name: "Dia do Trabalho" },
  { monthDay: "09-07", name: "Independência do Brasil" },
  { monthDay: "10-12", name: "Nossa Senhora Aparecida" },
  { monthDay: "11-02", name: "Finados" },
  { monthDay: "11-15", name: "Proclamação da República" },
  { monthDay: "11-20", name: "Dia da Consciência Negra" },
  { monthDay: "12-25", name: "Natal" },
] as const;

const GOOD_FRIDAY_OFFSET_IN_DAYS = -2;

function getEasterSunday(year: number): Date {
  const goldenNumber = year % 19;
  const century = Math.floor(year / 100);
  const yearOfCentury = year % 100;
  const leapCenturies = Math.floor(century / 4);
  const centuryRemainder = century % 4;
  const moonCorrection = Math.floor((century + 8) / 25);
  const solarCorrection = Math.floor((century - moonCorrection + 1) / 3);
  const epact =
    (19 * goldenNumber + century - leapCenturies - solarCorrection + 15) % 30;
  const leapYears = Math.floor(yearOfCentury / 4);
  const yearRemainder = yearOfCentury % 4;
  const weekdayOffset =
    (32 + 2 * centuryRemainder + 2 * leapYears - epact - yearRemainder) % 7;
  const monthCorrection = Math.floor(
    (goldenNumber + 11 * epact + 22 * weekdayOffset) / 451,
  );
  const month = Math.floor(
    (epact + weekdayOffset - 7 * monthCorrection + 114) / 31,
  );
  const day = ((epact + weekdayOffset - 7 * monthCorrection + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getNationalHolidays(year: number): HolidayInput[] {
  const goodFriday = addDays(getEasterSunday(year), GOOD_FRIDAY_OFFSET_IN_DAYS);
  return [
    ...FIXED_NATIONAL_HOLIDAYS.map((holiday) => ({
      date: `${year}-${holiday.monthDay}`,
      name: holiday.name,
    })),
    { date: format(goodFriday, "yyyy-MM-dd"), name: "Sexta-feira Santa" },
  ].sort((first, second) => first.date.localeCompare(second.date));
}
