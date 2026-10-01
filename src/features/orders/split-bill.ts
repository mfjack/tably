import type { OrderSummaryLine } from "./components/order-summary";

export const SPLIT_MODES = ["equal", "items", "custom"] as const;

export type SplitMode = (typeof SPLIT_MODES)[number];

export const SPLIT_MODE_LABELS = {
  equal: "Partes iguais",
  items: "Por itens",
  custom: "Valor livre",
} as const satisfies Record<SplitMode, string>;

export type BillUnit = {
  key: string;
  productName: string;
  amount: number;
};

export type UnitAssignments = Readonly<Record<string, number>>;

export function isSplitMode(value: string): value is SplitMode {
  return SPLIT_MODES.some((mode) => mode === value);
}

function toCents(value: number) {
  return Math.round(value * 100);
}

export function splitAmountEqually(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const totalCents = toCents(total);
  const baseCents = Math.floor(totalCents / parts);
  const remainderCents = totalCents - baseCents * parts;

  return Array.from(
    { length: parts },
    (_, index) => (baseCents + (index < remainderCents ? 1 : 0)) / 100,
  );
}

export function expandBillUnits(
  lines: readonly OrderSummaryLine[],
): BillUnit[] {
  return lines.flatMap((line, lineIndex) =>
    splitAmountEqually(line.total, line.quantity).map((amount, unitIndex) => ({
      key: `${lineIndex}:${unitIndex}`,
      productName: line.productName,
      amount,
    })),
  );
}

export function sumAmountsByPerson(
  units: readonly BillUnit[],
  assignments: UnitAssignments,
  peopleCount: number,
  takeawayFee: number,
): number[] {
  const feeShares = splitAmountEqually(takeawayFee, peopleCount);
  const personCents = feeShares.map(toCents);

  for (const unit of units) {
    const personIndex = assignments[unit.key];
    if (personIndex === undefined || personIndex >= peopleCount) continue;
    personCents[personIndex] =
      (personCents[personIndex] ?? 0) + toCents(unit.amount);
  }

  return personCents.map((cents) => cents / 100);
}

export function countUnassignedUnits(
  units: readonly BillUnit[],
  assignments: UnitAssignments,
  peopleCount: number,
): number {
  return units.filter((unit) => {
    const personIndex = assignments[unit.key];
    return personIndex === undefined || personIndex >= peopleCount;
  }).length;
}

export function removePersonFromAssignments(
  assignments: UnitAssignments,
  removedIndex: number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(assignments).flatMap(([unitKey, personIndex]) => {
      if (personIndex === removedIndex) return [];
      return [
        [unitKey, personIndex > removedIndex ? personIndex - 1 : personIndex],
      ];
    }),
  );
}
