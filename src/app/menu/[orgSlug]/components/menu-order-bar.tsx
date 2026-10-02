"use client";

import { ReceiptText, ShoppingBag } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicMenuItem } from "@/features/menu/types";
import {
  useHydratedMenuCartStore,
  useLatestRecentOrder,
  useMenuCartItems,
} from "@/features/online-orders/menu-cart-store";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MenuCartLine } from "./menu-cart-item-card";
import { buildOrderPath } from "./menu-order-path";

function loadMenuOrderSheet() {
  return import("./menu-order-sheet");
}

const MenuOrderSheet = dynamic(() =>
  loadMenuOrderSheet().then((module) => module.MenuOrderSheet),
);

type MenuOrderBarProps = {
  menuSlug: string;
  acceptsOrders: boolean;
  items: readonly PublicMenuItem[];
  className?: string;
};

export function MenuOrderBar({
  menuSlug,
  acceptsOrders,
  items,
  className,
}: MenuOrderBarProps) {
  const isHydrated = useHydratedMenuCartStore();
  const cartItems = useMenuCartItems(menuSlug);
  const latestOrder = useLatestRecentOrder(menuSlug);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hasOpenedSheet, setHasOpenedSheet] = useState(false);

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const cartLines: MenuCartLine[] = (isHydrated ? cartItems : []).flatMap(
    (cartItem) => {
      const menuItem = itemsById.get(cartItem.productId);
      if (!menuItem) return [];
      return [
        {
          productId: menuItem.id,
          name: menuItem.detail
            ? `${menuItem.name} ${menuItem.detail}`
            : menuItem.name,
          quantity: cartItem.quantity,
          note: cartItem.note,
          total: menuItem.price * cartItem.quantity,
        },
      ];
    },
  );
  const itemCount = cartLines.reduce((count, line) => count + line.quantity, 0);
  const total = cartLines.reduce((sum, line) => sum + line.total, 0);
  const hasCartItems = acceptsOrders && cartLines.length > 0;

  useEffect(() => {
    if (hasCartItems) void loadMenuOrderSheet();
  }, [hasCartItems]);

  function openSheet() {
    setHasOpenedSheet(true);
    setIsSheetOpen(true);
  }

  if (!hasCartItems && !latestOrder) return null;

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4",
          className,
        )}
      >
        <div className="flex w-full max-w-2xl flex-col gap-2">
          {latestOrder && !hasCartItems && (
            <Link
              href={buildOrderPath(menuSlug, latestOrder.id)}
              className="flex h-12 items-center justify-center gap-2 rounded-full border bg-card font-semibold shadow-lg"
            >
              <ReceiptText className="size-5" aria-hidden />
              Acompanhar meu pedido
            </Link>
          )}
          {hasCartItems && (
            <button
              type="button"
              className="flex h-14 items-center justify-between gap-3 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-lg"
              onClick={openSheet}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="size-5" aria-hidden />
                Ver pedido · {itemCount} {itemCount === 1 ? "item" : "itens"}
              </span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </button>
          )}
        </div>
      </div>

      {hasOpenedSheet && (
        <MenuOrderSheet
          menuSlug={menuSlug}
          cartLines={cartLines}
          total={total}
          isOpen={isSheetOpen && hasCartItems}
          onOpenChange={setIsSheetOpen}
        />
      )}
    </>
  );
}
