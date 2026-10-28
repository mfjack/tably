import { format } from "date-fns";
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import type {
  IngredientLastPurchase,
  MeasureUnit,
} from "@/features/ingredients/types";
import { formatPercent, formatUnitCost } from "@/lib/format";
import { cn } from "@/lib/utils";

const PRICE_CHANGE_TOLERANCE = 0.005;

type LastPurchaseNoteProps = {
  lastPurchase: IngredientLastPurchase;
  unit: MeasureUnit;
  quantity: number;
  totalCost: number;
};

export function LastPurchaseNote({
  lastPurchase,
  unit,
  quantity,
  totalCost,
}: LastPurchaseNoteProps) {
  const unitSymbol = getUnitSymbol(unit);
  const currentUnitCost =
    quantity > 0 && totalCost > 0 ? totalCost / quantity : null;
  const priceChange =
    currentUnitCost !== null && lastPurchase.unitCost > 0
      ? currentUnitCost / lastPurchase.unitCost - 1
      : null;
  const hasPriceChanged =
    priceChange !== null && Math.abs(priceChange) >= PRICE_CHANGE_TOLERANCE;

  return (
    <p className="flex flex-wrap gap-x-1.5 text-muted-foreground text-xs">
      <span>
        Última compra: {formatUnitCost(lastPurchase.unitCost)}/{unitSymbol} em{" "}
        {format(new Date(lastPurchase.purchasedAt), "dd/MM/yyyy")}
        {lastPurchase.supplierName ? ` · ${lastPurchase.supplierName}` : ""}
      </span>
      {currentUnitCost !== null && (
        <span
          className={cn(
            "font-medium",
            hasPriceChanged && priceChange > 0 && "text-destructive",
            hasPriceChanged &&
              priceChange < 0 &&
              "text-emerald-600 dark:text-emerald-400",
          )}
        >
          · Agora: {formatUnitCost(currentUnitCost)}/{unitSymbol}
          {hasPriceChanged &&
            ` (${formatPercent(Math.abs(priceChange))} ${priceChange > 0 ? "mais caro" : "mais barato"})`}
        </span>
      )}
    </p>
  );
}
