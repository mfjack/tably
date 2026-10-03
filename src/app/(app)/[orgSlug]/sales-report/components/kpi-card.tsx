import { TrendingDown, TrendingUp } from "lucide-react";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string;
  detail?: string;
  change?: number | null;
};

export function KpiCard({ label, value, detail, change }: KpiCardProps) {
  const hasChange = change !== undefined && change !== null;
  const isPositive = hasChange && change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <article className="flex min-w-0 flex-col gap-1.5 rounded-2xl border bg-card p-4">
      <h3 className="text-muted-foreground text-sm">{label}</h3>
      <p className="truncate font-bold text-xl tabular-nums tracking-[-0.02em]">
        {value}
      </p>
      <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem]">
        {hasChange && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium tabular-nums",
              isPositive ? "text-primary" : "text-destructive",
            )}
          >
            <TrendIcon aria-hidden className="size-3.5" />
            {isPositive ? "+" : ""}
            {formatPercent(change)}
            <span className="sr-only">em relação ao período anterior</span>
          </span>
        )}
        {detail && <span className="text-muted-foreground">{detail}</span>}
      </div>
    </article>
  );
}
