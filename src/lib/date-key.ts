import { format } from "date-fns";

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
