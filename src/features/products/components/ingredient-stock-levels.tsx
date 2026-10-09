import { getUnitSymbol } from "@/features/ingredients/measure-units";
import { formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { IngredientStockLevel } from "../availability";

type IngredientStockLevelsProps = {
  stockLevels: readonly IngredientStockLevel[];
  className?: string;
};

export function IngredientStockLevels({
  stockLevels,
  className,
}: IngredientStockLevelsProps) {
  if (stockLevels.length === 0) return null;

  return (
    <ul className={cn("flex flex-col gap-0.5 text-xs", className)}>
      {stockLevels.map((level) => {
        const unitSymbol = getUnitSymbol(level.unit);
        const isBelowMinimum = level.stock <= level.minimumStock;
        return (
          <li
            key={level.name}
            className="flex items-baseline justify-between gap-3"
          >
            <span className="truncate">{level.name}</span>
            <span
              className={cn(
                "shrink-0 tabular-nums",
                isBelowMinimum ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {formatQuantity(level.stock)} {unitSymbol} /{" "}
              {formatQuantity(level.minimumStock)} {unitSymbol}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
