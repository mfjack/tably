"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useHydratedMenuCartStore,
  useMenuCartItemQuantity,
  useMenuCartStore,
} from "@/features/online-orders/menu-cart-store";
import type { ProductId } from "@/features/products/types";

type MenuItemOrderControlProps = {
  menuSlug: string;
  productId: ProductId;
  productName: string;
  remaining: number | null;
};

export function MenuItemOrderControl({
  menuSlug,
  productId,
  productName,
  remaining,
}: MenuItemOrderControlProps) {
  const isHydrated = useHydratedMenuCartStore();
  const storedQuantity = useMenuCartItemQuantity(menuSlug, productId);
  const quantity = isHydrated ? storedQuantity : 0;
  const incrementItem = useMenuCartStore((state) => state.incrementItem);
  const decrementItem = useMenuCartStore((state) => state.decrementItem);
  const hasReachedRemaining = remaining !== null && quantity >= remaining;

  function addItem() {
    if (hasReachedRemaining) return;
    incrementItem(menuSlug, productId);
  }

  function removeItem() {
    decrementItem(menuSlug, productId);
  }

  if (quantity === 0) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="shrink-0 rounded-full"
        aria-label={`Adicionar ${productName}`}
        onClick={addItem}
      >
        <Plus aria-hidden />
      </Button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="rounded-full"
        aria-label={`Remover um ${productName}`}
        onClick={removeItem}
      >
        <Minus aria-hidden />
      </Button>
      <span className="w-5 text-center font-semibold tabular-nums">
        {quantity}
      </span>
      <Button
        type="button"
        size="icon-lg"
        className="rounded-full"
        aria-label={
          hasReachedRemaining
            ? `Só restam ${remaining} ${productName}`
            : `Adicionar mais um ${productName}`
        }
        disabled={hasReachedRemaining}
        onClick={addItem}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
