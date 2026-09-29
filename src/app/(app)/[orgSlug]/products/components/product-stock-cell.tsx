import { Badge } from "@/components/ui/badge";
import type {
  IngredientShortages,
  ProductAvailability,
} from "@/features/products/availability";
import { formatQuantity } from "@/lib/format";
import { IngredientShortageLine } from "./ingredient-shortage-line";

type ProductStockCellProps = {
  availability: ProductAvailability;
};

type IngredientShortageListProps = {
  shortages: IngredientShortages;
};

function IngredientShortageList({ shortages }: IngredientShortageListProps) {
  const { outOfStockIngredientNames, runningLowIngredientNames } = shortages;

  return (
    <>
      <IngredientShortageLine
        label="Sem"
        ingredientNames={outOfStockIngredientNames}
        className="text-destructive"
      />
      <IngredientShortageLine
        label="Acabando"
        ingredientNames={runningLowIngredientNames}
        className="text-muted-foreground"
      />
    </>
  );
}

export function ProductStockCell({ availability }: ProductStockCellProps) {
  if (availability.status === "unlimited") {
    return (
      <span className="text-muted-foreground" title="Produto sem ficha técnica">
        —
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {availability.status === "out" ? (
        <Badge variant="destructive">Esgotado</Badge>
      ) : (
        <div className="flex items-center gap-2">
          <span className="tabular-nums">
            {formatQuantity(availability.remaining)} un
          </span>
          {availability.status === "low" && (
            <Badge variant="destructive">Estoque baixo</Badge>
          )}
        </div>
      )}
      <IngredientShortageList shortages={availability} />
    </div>
  );
}
