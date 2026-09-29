import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX_LABELED_BARS = 12;
const MIN_VISIBLE_BAR_PERCENT = 2;

export type ReportBar = {
  key: string;
  axisLabel: string;
  tooltipLabel: string;
  revenue: number;
  orderCount: number;
};

type ReportBarChartProps = {
  bars: readonly ReportBar[];
  highlightedKey: string | null;
};

function getBarHeightPercent(revenue: number, maxRevenue: number) {
  if (revenue <= 0) return 0;
  return Math.max((revenue / maxRevenue) * 100, MIN_VISIBLE_BAR_PERCENT);
}

function formatOrderCount(orderCount: number) {
  return `${orderCount} ${orderCount === 1 ? "pedido" : "pedidos"}`;
}

export function ReportBarChart({ bars, highlightedKey }: ReportBarChartProps) {
  const maxRevenue = Math.max(...bars.map((bar) => bar.revenue), 1);
  const labelStep = Math.ceil(bars.length / MAX_LABELED_BARS);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-44 items-end gap-1.5">
        {bars.map((bar) => (
          <Tooltip key={bar.key}>
            <TooltipTrigger
              render={
                <div
                  role="img"
                  aria-label={`${bar.tooltipLabel}: ${formatCurrency(bar.revenue)}, ${formatOrderCount(bar.orderCount)}`}
                  className="flex h-full min-w-0 flex-1 items-end"
                />
              }
            >
              <div
                className={cn(
                  "w-full rounded-t-md transition-colors",
                  bar.key === highlightedKey
                    ? "bg-primary"
                    : "bg-primary/35 hover:bg-primary/60",
                )}
                style={{
                  height: `${getBarHeightPercent(bar.revenue, maxRevenue)}%`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {bar.tooltipLabel} · {formatCurrency(bar.revenue)} ·{" "}
              {formatOrderCount(bar.orderCount)}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {bars.map((bar, barIndex) => (
          <span
            key={bar.key}
            className={cn(
              "min-w-0 flex-1 truncate text-center text-muted-foreground text-xs",
              bar.key === highlightedKey && "font-semibold text-foreground",
            )}
          >
            {barIndex % labelStep === 0 || bar.key === highlightedKey
              ? bar.axisLabel
              : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
