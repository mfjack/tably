import type { CashMovement, CashMovementKind } from "./types";

export const CASH_MOVEMENT_LABELS = {
  withdrawal: "Retirada",
  supply: "Reforço",
} as const satisfies Record<CashMovementKind, string>;

export function describeCashMovement(
  movement: Pick<CashMovement, "kind" | "note">,
): string {
  const label = CASH_MOVEMENT_LABELS[movement.kind];
  return movement.note ? `${label} · ${movement.note}` : label;
}
