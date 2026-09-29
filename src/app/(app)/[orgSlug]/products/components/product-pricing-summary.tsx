import { CostValue } from "@/features/products/components/cost-value";
import { MarginValue } from "@/features/products/components/margin-value";
import type { ProductPricing } from "@/features/products/pricing";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProductPricingSummaryProps = {
  pricing: ProductPricing;
};

export function ProductPricingSummary({ pricing }: ProductPricingSummaryProps) {
  return (
    <dl
      aria-live="polite"
      className="grid grid-cols-3 gap-4 rounded-lg bg-muted px-4 py-3 text-sm"
    >
      <div className="flex flex-col gap-0.5">
        <dt className="text-muted-foreground">Custo (CMV)</dt>
        <dd>
          <CostValue
            cost={pricing.cost}
            costRatio={pricing.costRatio}
            className="font-semibold"
          />
        </dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-muted-foreground">Lucro por unidade</dt>
        <dd
          className={cn(
            "font-semibold tabular-nums",
            pricing.profit < 0 && "text-destructive",
          )}
        >
          {formatCurrency(pricing.profit)}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-muted-foreground">Margem</dt>
        <dd>
          <MarginValue margin={pricing.margin} className="font-semibold" />
        </dd>
      </div>
    </dl>
  );
}
