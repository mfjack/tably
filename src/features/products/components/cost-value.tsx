import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type CostValueProps = {
  cost: number;
  costRatio: number | null;
  className?: string;
};

export function CostValue({ cost, costRatio, className }: CostValueProps) {
  return (
    <span className={cn("tabular-nums", className)}>
      {formatCurrency(cost)}
      {costRatio !== null && (
        <span className="ml-1.5 font-normal text-muted-foreground">
          · {formatPercent(costRatio)}
        </span>
      )}
    </span>
  );
}
