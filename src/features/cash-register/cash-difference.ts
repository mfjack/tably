import type { CashSessionSummary } from "./types";

export type CashDifference = {
  status: "balanced" | "over" | "short";
  label: string;
  amount: number;
};

export function getCashDifference(
  summary: Pick<CashSessionSummary, "countedCash" | "expectedCash">,
): CashDifference | null {
  if (summary.countedCash === null) return null;

  const differenceCents =
    Math.round(summary.countedCash * 100) -
    Math.round(summary.expectedCash * 100);

  if (differenceCents === 0) {
    return { status: "balanced", label: "Bateu", amount: 0 };
  }
  return differenceCents > 0
    ? { status: "over", label: "Sobra", amount: differenceCents / 100 }
    : { status: "short", label: "Falta", amount: -differenceCents / 100 };
}
