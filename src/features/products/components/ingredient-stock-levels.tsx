import { StockLinkButton } from "@/features/ingredients/components/stock-link-button";
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import { formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { IngredientStockLevel } from "../availability";

type IngredientStockLevelsProps = {
  stockLevels: readonly IngredientStockLevel[];
  className?: string;
  getStockHref?: (level: IngredientStockLevel) => string;
};

export function IngredientStockLevels({
  stockLevels,
  className,
  getStockHref,
}: IngredientStockLevelsProps) {
  if (stockLevels.length === 0) return null;

  return (
    <ul
      className={cn(
        "flex flex-col text-xs",
        getStockHref ? "gap-3" : "gap-0.5",
        className,
      )}
    >
      {stockLevels.map((level) => {
        const unitSymbol = getUnitSymbol(level.unit);
        const isBelowMinimum = level.stock <= level.minimumStock;
        const stockSummary = (
          <span
            className={cn(
              "shrink-0 tabular-nums",
              isBelowMinimum ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {formatQuantity(level.stock)} {unitSymbol} /{" "}
            {formatQuantity(level.minimumStock)} {unitSymbol}
          </span>
        );

        if (!getStockHref) {
          return (
            <li
              key={level.ingredientId}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="truncate">{level.name}</span>
              {stockSummary}
            </li>
          );
        }

        return (
          <li
            key={level.ingredientId}
            className="flex items-start justify-between gap-4"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-medium text-sm">{level.name}</span>
              {stockSummary}
            </span>
            <StockLinkButton itemName={level.name} href={getStockHref(level)} />
          </li>
        );
      })}
    </ul>
  );
}
