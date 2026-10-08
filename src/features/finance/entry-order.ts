import type { FinancialEntry } from "./types";

export function sortPaidEntriesLast(
  entries: readonly FinancialEntry[],
): FinancialEntry[] {
  return [
    ...entries.filter((entry) => entry.paidAt === null),
    ...entries.filter((entry) => entry.paidAt !== null),
  ];
}
