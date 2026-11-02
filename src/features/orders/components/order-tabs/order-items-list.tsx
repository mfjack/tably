import { Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  OrderDetails,
  OrderItem,
  OrderItemId,
} from "@/features/orders/types";
import { ItemAddonNames } from "@/features/product-addons/components/item-addon-names";
import { formatCurrency } from "@/lib/format";

type OrderItemsListProps = {
  order: OrderDetails;
  removingItemId?: OrderItemId | null;
  onRemoveItem?: (item: OrderItem) => void;
};

export function OrderItemsList({
  order,
  removingItemId = null,
  onRemoveItem,
}: OrderItemsListProps) {
  return (
    <section aria-label="Itens da comanda" className="flex flex-col gap-3">
      {order.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum produto nessa comanda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex min-h-8 items-center justify-between gap-4 text-sm"
            >
              <span className="min-w-0 truncate">
                <strong className="mr-1.5 font-semibold tabular-nums">
                  {item.quantity}x
                </strong>
                {item.productName}
                <ItemAddonNames addonNames={item.addonNames} />
                {item.note && (
                  <span className="block truncate text-primary text-xs">
                    ↳ {item.note}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="tabular-nums">
                  {formatCurrency(item.total)}
                </span>
                {onRemoveItem && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Remover 1 ${item.productName}`}
                    disabled={removingItemId !== null}
                    onClick={() => onRemoveItem(item)}
                  >
                    {removingItemId === item.id ? (
                      <Spinner aria-hidden />
                    ) : (
                      <Minus aria-hidden />
                    )}
                  </Button>
                )}
              </span>
            </li>
          ))}
          {order.takeawayFee > 0 && (
            <li className="flex items-baseline justify-between gap-4 text-muted-foreground text-sm">
              <span>Para levar</span>
              <span className="tabular-nums">
                {formatCurrency(order.takeawayFee)}
              </span>
            </li>
          )}
          {order.serviceFee > 0 && (
            <li className="flex items-baseline justify-between gap-4 text-muted-foreground text-sm">
              <span>Taxa de serviço</span>
              <span className="tabular-nums">
                {formatCurrency(order.serviceFee)}
              </span>
            </li>
          )}
          {order.loyaltyReward > 0 && (
            <li className="flex items-baseline justify-between gap-4 text-primary text-sm">
              <span>Prêmio da fidelidade</span>
              <span className="tabular-nums">
                − {formatCurrency(order.loyaltyReward)}
              </span>
            </li>
          )}
          {order.discount > 0 && (
            <li className="flex items-baseline justify-between gap-4 text-primary text-sm">
              <span>Desconto</span>
              <span className="tabular-nums">
                − {formatCurrency(order.discount)}
              </span>
            </li>
          )}
        </ul>
      )}

      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="font-bold text-base">Total</span>
        <span className="font-bold text-lg tabular-nums">
          {formatCurrency(order.total)}
        </span>
      </div>
    </section>
  );
}
