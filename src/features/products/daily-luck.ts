const WEEKEND_DAYS: readonly number[] = [0, 6];

export function isDailyLuckDay(date: Date = new Date()): boolean {
  return WEEKEND_DAYS.includes(date.getDay());
}
