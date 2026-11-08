import { format } from "date-fns";
import { CloudOff, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OrderDetails, OrderId } from "@/features/orders/types";
import { formatCurrency } from "@/lib/format";
import { formatTimeAgo } from "@/lib/format-date";
import { cn } from "@/lib/utils";

const ONE_MINUTE_IN_MS = 60 * 1000;

type OpenOrderTabCardProps = {
  order: OrderDetails;
  now: Date;
  onSelect: (orderId: OrderId) => void;
};

function describeOpenedAt(createdAt: string, now: Date) {
  const openedAt = new Date(createdAt);
  const openedTime = format(openedAt, "HH:mm");
  const timeAgo =
    now.getTime() - openedAt.getTime() < ONE_MINUTE_IN_MS
      ? "agora"
      : formatTimeAgo(openedAt);
  return `Aberta às ${openedTime} · ${timeAgo}`;
}

function getItemCount(order: OrderDetails) {
  return order.items.reduce((count, item) => count + item.quantity, 0);
}

export function OpenOrderTabCard({
  order,
  now,
  onSelect,
}: OpenOrderTabCardProps) {
  const itemCount = getItemCount(order);

  return (
    <button
      type="button"
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card p-4 text-left shadow-xs transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        order.isPendingSync && "border-warning/40 border-dashed",
      )}
      onClick={() => onSelect(order.id)}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-base">
            {order.customerName}
          </p>
          {order.isPendingSync ? (
            <p className="flex items-center gap-1 whitespace-nowrap text-warning text-xs">
              <CloudOff aria-hidden className="size-3.5 shrink-0" />
              Aguardando internet · {format(new Date(order.createdAt), "HH:mm")}
            </p>
          ) : (
            <p className="truncate whitespace-nowrap text-muted-foreground text-xs">
              {describeOpenedAt(order.createdAt, now)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {order.isFromMenu && (
            <Badge variant="outline">
              <QrCode aria-hidden />
              Pelo cardápio
            </Badge>
          )}
          {order.isTakeaway && <Badge variant="secondary">Para levar</Badge>}
        </div>
      </div>
      <div className="flex w-full items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-sm">
          {itemCount} {itemCount === 1 ? "item" : "itens"}
        </span>
        <span className="font-bold text-base tabular-nums">
          {formatCurrency(order.total)}
        </span>
      </div>
    </button>
  );
}
