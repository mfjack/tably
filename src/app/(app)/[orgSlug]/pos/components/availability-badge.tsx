import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StockLinkButton } from "@/features/ingredients/components/stock-link-button";
import type { ProductAvailability } from "@/features/products/availability";
import { IngredientStockLevels } from "@/features/products/components/ingredient-stock-levels";
import { cn } from "@/lib/utils";
import { buildStockSearchHref, type StockLinks } from "../stock-links";

type AvailabilityBadgeProps = {
  productName: string;
  label: string;
  availability: ProductAvailability;
  isProductStock: boolean;
  stockLinks?: StockLinks;
};

export function AvailabilityBadge({
  productName,
  label,
  availability,
  isProductStock,
  stockLinks,
}: AvailabilityBadgeProps) {
  if (availability.status === "unlimited") return null;
  const isOut = availability.status === "out";
  const isLow = availability.status === "low";
  const { stockLevels } = availability;
  const singleStockLevel = stockLevels.length === 1 ? stockLevels[0] : null;
  const productsHref = stockLinks?.productsHref ?? null;
  const ingredientsHref = stockLinks?.ingredientsHref ?? null;
  const productStockHref =
    isProductStock && productsHref
      ? buildStockSearchHref(productsHref, productName)
      : null;
  const singleIngredientHref =
    !productStockHref && singleStockLevel && ingredientsHref
      ? buildStockSearchHref(ingredientsHref, singleStockLevel.name)
      : null;

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
              "pointer-events-auto relative z-10 inline-flex h-5 max-w-full shrink-0 items-center overflow-hidden rounded px-1.5 font-semibold text-[0.625rem] leading-none underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              isOut && "bg-muted-foreground text-background",
              isLow && "bg-destructive/15 text-destructive",
              availability.status === "available" &&
                "bg-muted text-muted-foreground",
            )}
          />
        }
      >
        {isLow && <Info className="mr-1 size-3" aria-hidden />}
        {label}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="flex w-auto max-w-72 flex-col gap-1"
      >
        <div className="flex items-center justify-between gap-4">
          <p className="font-semibold text-sm">
            {isOut ? label : `Restam ${label}`}
          </p>
          {productStockHref && (
            <StockLinkButton itemName={productName} href={productStockHref} />
          )}
          {singleStockLevel && singleIngredientHref && (
            <StockLinkButton
              itemName={singleStockLevel.name}
              href={singleIngredientHref}
            />
          )}
        </div>
        <IngredientStockLevels
          stockLevels={stockLevels}
          getStockHref={
            singleStockLevel || !ingredientsHref
              ? undefined
              : (level) => buildStockSearchHref(ingredientsHref, level.name)
          }
        />
      </PopoverContent>
    </Popover>
  );
}
