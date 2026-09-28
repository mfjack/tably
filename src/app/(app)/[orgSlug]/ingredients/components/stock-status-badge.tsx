import { Badge } from "@/components/ui/badge";
import {
  getStockStatus,
  type StockStatus,
} from "@/features/ingredients/measure-units";
import type { Ingredient } from "@/features/ingredients/types";

const STOCK_STATUS_LABELS = {
  out: "Sem estoque",
  low: "Estoque baixo",
} as const satisfies Partial<Record<StockStatus, string>>;

type StockStatusBadgeProps = {
  ingredient: Pick<Ingredient, "currentStock" | "minimumStock">;
};

export function StockStatusBadge({ ingredient }: StockStatusBadgeProps) {
  const stockStatus = getStockStatus(ingredient);

  if (stockStatus === "ok") return null;

  return (
    <Badge variant="destructive">{STOCK_STATUS_LABELS[stockStatus]}</Badge>
  );
}
