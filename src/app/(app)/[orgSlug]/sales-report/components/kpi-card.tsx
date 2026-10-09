import { TrendingDown, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/stat-card";
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
    <StatCard
      label={label}
      value={value}
      detail={
        (hasChange || detail) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
            {detail && <span>{detail}</span>}
          </div>
        )
      }
    />
  );
}
