import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StockEntryButton } from "@/features/ingredients/components/stock-entry-button";
import type { IngredientId } from "@/features/ingredients/types";
import type { ProductAvailability } from "@/features/products/availability";
import { IngredientStockLevels } from "@/features/products/components/ingredient-stock-levels";
import { cn } from "@/lib/utils";

type AvailabilityBadgeProps = {
  productName: string;
  label: string;
  availability: ProductAvailability;
  onAddStock?: (ingredientId: IngredientId) => void;
};

export function AvailabilityBadge({
  productName,
  label,
  availability,
  onAddStock,
}: AvailabilityBadgeProps) {
  if (availability.status === "unlimited") return null;
  const isOut = availability.status === "out";
  const { stockLevels } = availability;
  const singleStockLevel = stockLevels.length === 1 ? stockLevels[0] : null;

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        render={
          <button
            type="button"
            aria-label={`${label} · ver o que falta para ${productName}`}
            className={cn(
              "pointer-events-auto relative z-10 inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded px-1.5 font-semibold text-[0.625rem] leading-none underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              isOut
                ? "bg-muted-foreground text-background"
                : "bg-destructive/15 text-destructive",
            )}
          />
        }
      >
        {label}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="flex w-auto max-w-72 flex-col gap-1"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="font-semibold text-sm">{label}</p>
          {onAddStock && singleStockLevel && (
            <StockEntryButton
              ingredientName={singleStockLevel.name}
              onClick={() => onAddStock(singleStockLevel.ingredientId)}
            />
          )}
        </div>
        <IngredientStockLevels
          stockLevels={stockLevels}
          onAddStock={singleStockLevel ? undefined : onAddStock}
        />
      </PopoverContent>
    </Popover>
  );
}
