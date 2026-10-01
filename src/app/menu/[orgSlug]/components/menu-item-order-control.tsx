"use client";

import { Minus, Plus } from "lucide-react";
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
};

const CONTROL_BUTTON_CLASS_NAME =
  "flex size-8 items-center justify-center rounded-full border-2 border-black transition-colors active:bg-black active:text-white";

export function MenuItemOrderControl({
  menuSlug,
  productId,
  productName,
}: MenuItemOrderControlProps) {
  const isHydrated = useHydratedMenuCartStore();
  const storedQuantity = useMenuCartItemQuantity(menuSlug, productId);
  const quantity = isHydrated ? storedQuantity : 0;
  const incrementItem = useMenuCartStore((state) => state.incrementItem);
  const decrementItem = useMenuCartStore((state) => state.decrementItem);

  if (quantity === 0) {
    return (
      <button
        type="button"
        aria-label={`Adicionar ${productName}`}
        className={CONTROL_BUTTON_CLASS_NAME}
        onClick={() => incrementItem(menuSlug, productId)}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Remover um ${productName}`}
        className={CONTROL_BUTTON_CLASS_NAME}
        onClick={() => decrementItem(menuSlug, productId)}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span className="w-5 text-center font-bold tabular-nums">{quantity}</span>
      <button
        type="button"
        aria-label={`Adicionar mais um ${productName}`}
        className="flex size-8 items-center justify-center rounded-full border-2 border-black bg-black text-white"
        onClick={() => incrementItem(menuSlug, productId)}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
