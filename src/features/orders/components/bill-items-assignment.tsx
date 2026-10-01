"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { BillUnit, UnitAssignments } from "../split-bill";

type BillItemsAssignmentProps = {
  units: readonly BillUnit[];
  assignments: UnitAssignments;
  peopleCount: number;
  onAssign: (unitKey: string, personIndex: number) => void;
};

export function BillItemsAssignment({
  units,
  assignments,
  peopleCount,
  onAssign,
}: BillItemsAssignmentProps) {
  const people = Array.from({ length: peopleCount }, (_, index) => index);

  return (
    <section
      aria-label="Itens de cada pessoa"
      className="flex flex-col gap-2 rounded-lg border p-3"
    >
      <p className="text-muted-foreground text-sm">
        Toque no número da pessoa que vai pagar cada item.
      </p>
      <ul className="flex flex-col divide-y">
        {units.map((unit) => (
          <li
            key={unit.key}
            className="flex items-center justify-between gap-3 py-2"
          >
            <span className="min-w-0 text-sm">
              <span className="block truncate font-medium">
                {unit.productName}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {formatCurrency(unit.amount)}
              </span>
            </span>
            <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
              {people.map((personIndex) => {
                const isSelected = assignments[unit.key] === personIndex;
                return (
                  <Button
                    key={personIndex}
                    type="button"
                    size="icon-sm"
                    variant={isSelected ? "default" : "outline"}
                    aria-pressed={isSelected}
                    aria-label={`${unit.productName} para a pessoa ${personIndex + 1}`}
                    onClick={() => onAssign(unit.key, personIndex)}
                  >
                    {personIndex + 1}
                  </Button>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
