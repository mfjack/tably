"use client";

import { ChevronUp } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/format";
import { CartPanel } from "./cart-panel";

type MobileCartSheetProps = Omit<
  ComponentProps<typeof CartPanel>,
  "variant"
> & {
  hasOpenOrders: boolean;
};

function formatItemCount(itemCount: number) {
  return `${itemCount} ${itemCount === 1 ? "item" : "itens"}`;
}

export function MobileCartSheet({
  hasOpenOrders,
  ...cartPanelProps
}: MobileCartSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { cartLines, onSendToKitchen, onQuickPayment, onAddToTab } =
    cartPanelProps;
  const itemCount = cartLines.reduce(
    (count, cartLine) => count + cartLine.quantity,
    0,
  );
  const orderTotal = cartLines.reduce(
    (total, cartLine) => total + cartLine.total,
    0,
  );

  useEffect(() => {
    if (!hasOpenOrders) setIsOpen(false);
  }, [hasOpenOrders]);

  return (
    <>
      {hasOpenOrders && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:hidden">
          <button
            type="button"
            className="flex h-14 w-full items-center gap-3 rounded-xl bg-primary px-4 text-primary-foreground shadow-lg"
            onClick={() => setIsOpen(true)}
          >
            <ChevronUp aria-hidden className="size-5 shrink-0" />
            <span className="flex-1 text-left">
              <span className="block font-semibold text-base">Ver pedido</span>
              <span className="block text-primary-foreground/80 text-xs">
                {formatItemCount(itemCount)}
              </span>
            </span>
            <span className="font-bold text-lg tabular-nums">
              {formatCurrency(orderTotal)}
            </span>
          </button>
        </div>
      )}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85svh] gap-0 rounded-t-2xl p-0 md:hidden"
        >
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>Pedido atual</SheetTitle>
            <SheetDescription className="sr-only">
              Itens, observação e pagamento do pedido.
            </SheetDescription>
          </SheetHeader>
          <CartPanel
            variant="sheet"
            {...cartPanelProps}
            onSendToKitchen={() => {
              setIsOpen(false);
              onSendToKitchen();
            }}
            onQuickPayment={() => {
              setIsOpen(false);
              onQuickPayment();
            }}
            onAddToTab={() => {
              setIsOpen(false);
              onAddToTab();
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
