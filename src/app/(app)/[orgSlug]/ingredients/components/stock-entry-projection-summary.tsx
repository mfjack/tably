import { getUnitSymbol } from "@/features/ingredients/measure-units";
import { projectStockEntry } from "@/features/ingredients/stock-cost";
import type { Ingredient } from "@/features/ingredients/types";
import { formatPreciseCurrency, formatQuantity } from "@/lib/format";

type StockEntryProjectionSummaryProps = {
  ingredient: Ingredient;
  quantity: number;
  totalCost: number;
};

export function StockEntryProjectionSummary({
  ingredient,
  quantity,
  totalCost,
}: StockEntryProjectionSummaryProps) {
  const unitSymbol = getUnitSymbol(ingredient.unit);
  const projection = projectStockEntry(ingredient, quantity, totalCost);

  return (
    <dl
      aria-live="polite"
      className="grid grid-cols-2 gap-4 rounded-[10px] bg-muted px-4 py-3 text-sm"
    >
      <div className="flex flex-col gap-0.5">
        <dt className="text-muted-foreground">Estoque após a entrada</dt>
        <dd className="font-semibold tabular-nums">
          {formatQuantity(projection.stock)} {unitSymbol}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-muted-foreground">Novo custo médio</dt>
        <dd className="font-semibold tabular-nums">
          {formatPreciseCurrency(projection.unitCost)} / {unitSymbol}
        </dd>
      </div>
    </dl>
  );
}
