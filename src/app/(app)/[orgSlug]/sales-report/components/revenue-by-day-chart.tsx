import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SalesByDay } from "@/features/sales-report/types";
import { formatCurrency } from "@/lib/format";

const MAX_LABELED_DAYS = 8;
const MIN_VISIBLE_BAR_PERCENT = 2;

type RevenueByDayChartProps = {
  days: readonly SalesByDay[];
};

function formatDayLabel(date: string, dayCount: number) {
  return format(parseISO(date), dayCount <= 7 ? "EEEEEE" : "dd/MM", {
    locale: ptBR,
  });
}

function getBarHeightPercent(revenue: number, maxRevenue: number) {
  if (revenue <= 0) return 0;
  return Math.max((revenue / maxRevenue) * 100, MIN_VISIBLE_BAR_PERCENT);
}

export function RevenueByDayChart({ days }: RevenueByDayChartProps) {
  const maxRevenue = Math.max(...days.map((day) => day.revenue), 1);
  const labelStep = Math.ceil(days.length / MAX_LABELED_DAYS);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-44 items-end gap-1.5">
        {days.map((day) => (
          <Tooltip key={day.date}>
            <TooltipTrigger
              render={
                <div
                  role="img"
                  aria-label={`${format(parseISO(day.date), "dd/MM")}: ${formatCurrency(day.revenue)}`}
                  className="flex h-full min-w-0 flex-1 items-end"
                />
              }
            >
              <div
                className="w-full rounded-t-md bg-primary/80 transition-colors hover:bg-primary"
                style={{
                  height: `${getBarHeightPercent(day.revenue, maxRevenue)}%`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {format(parseISO(day.date), "dd/MM")} ·{" "}
              {formatCurrency(day.revenue)} · {day.orderCount}{" "}
              {day.orderCount === 1 ? "pedido" : "pedidos"}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {days.map((day, dayIndex) => (
          <span
            key={day.date}
            className="min-w-0 flex-1 truncate text-center text-muted-foreground text-xs capitalize"
          >
            {dayIndex % labelStep === 0
              ? formatDayLabel(day.date, days.length)
              : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
