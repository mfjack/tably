import { toCents } from "@/lib/money";
import type { CashSessionSummary } from "./types";

export type CashDifference = {
  status: "balanced" | "over" | "short";
  label: string;
  amount: number;
};

export function getCashDifferenceCents(
  countedCash: number,
  expectedCash: number,
): number {
  return toCents(countedCash) - toCents(expectedCash);
}

export function getCashDifference(
  summary: Pick<CashSessionSummary, "countedCash" | "expectedCash">,
): CashDifference | null {
  if (summary.countedCash === null) return null;

  const differenceCents = getCashDifferenceCents(
    summary.countedCash,
    summary.expectedCash,
  );

  if (differenceCents === 0) {
    return { status: "balanced", label: "Bateu", amount: 0 };
  }
  return differenceCents > 0
    ? { status: "over", label: "Sobra", amount: differenceCents / 100 }
    : { status: "short", label: "Falta", amount: -differenceCents / 100 };
}
