import { addBusinessDays, format, parseISO } from "date-fns";
import { formatDateKey } from "@/lib/format";

export type PendingReceivables = {
  amount: number;
  lastExpectedOn: string | null;
  today: string;
};

export function describePendingReceivables({
  lastExpectedOn,
  today,
}: PendingReceivables): string {
  if (!lastExpectedOn) return "Nada para cair na conta";
  const nextBusinessDay = format(
    addBusinessDays(parseISO(today), 1),
    "yyyy-MM-dd",
  );
  return lastExpectedOn === nextBusinessDay
    ? "Cai na conta no próximo dia útil"
    : `Cai na conta até ${formatDateKey(lastExpectedOn).slice(0, 5)}`;
}
