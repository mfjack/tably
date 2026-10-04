import { formatWeekdayAndDate } from "@/lib/format-date";

export function PosHeaderDescription() {
  return (
    <span suppressHydrationWarning>{formatWeekdayAndDate(new Date())}</span>
  );
}
