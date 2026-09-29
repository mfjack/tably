"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductId } from "@/features/products/types";
import { formatCurrency } from "@/lib/format";
import type { CartLine } from "../hooks/use-pos-catalog";

type CartItemCardProps = {
  cartLine: CartLine;
  onDecrement: (productId: ProductId) => void;
};

export function CartItemCard({ cartLine, onDecrement }: CartItemCardProps) {
  const { product, quantity, total } = cartLine;

  return (
    <li className="flex items-center gap-3.5 rounded-xl border bg-card p-3 shadow-xs">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border font-bold text-[13px] shadow-xs tabular-nums">
        {quantity}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-[15px]">
          {product.name}
        </span>
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatCurrency(total)}
        </span>
      </div>
      <Button
        type="button"
        variant="destructive"
        size="icon-lg"
        aria-label={`Remover 1 ${product.name} do pedido`}
        onClick={() => onDecrement(product.id)}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}
