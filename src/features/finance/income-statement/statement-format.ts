import type { StatTone } from "@/components/stat-card";
import type { BenchmarkStatus, StatementLineKind } from "./types";

export type StatementSign = "plus" | "minus" | "none";

export function getStatementSign(kind: StatementLineKind): StatementSign {
  if (kind === "deduction") return "minus";
  if (kind === "revenue") return "plus";
  return "none";
}

export function getVariation(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export const BENCHMARK_TONES = {
  good: "good",
  attention: "attention",
  bad: "bad",
  none: "default",
} as const satisfies Record<BenchmarkStatus, StatTone>;
