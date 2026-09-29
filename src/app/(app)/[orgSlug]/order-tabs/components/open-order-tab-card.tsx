import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import type { OrderDetails, OrderId } from "@/features/orders/types";
import { formatCurrency } from "@/lib/format";

type OpenOrderTabCardProps = {
  order: OrderDetails;
  onSelect: (orderId: OrderId) => void;
};

function getItemCount(order: OrderDetails) {
  return order.items.reduce((count, item) => count + item.quantity, 0);
}

export function OpenOrderTabCard({ order, onSelect }: OpenOrderTabCardProps) {
  const itemCount = getItemCount(order);

  return (
    <button
      type="button"
      className="flex flex-col gap-4 rounded-2xl border bg-card p-4 text-left shadow-xs transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      onClick={() => onSelect(order.id)}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-base">
            {order.customerName}
          </p>
          <p className="text-muted-foreground text-xs">
            Aberta há{" "}
            {formatDistanceToNowStrict(new Date(order.createdAt), {
              locale: ptBR,
            })}
          </p>
        </div>
        {order.isTakeaway && <Badge variant="secondary">Para levar</Badge>}
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
