"use client";

import { ClipboardPlus, CreditCard, Printer, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import type { OrderTabTarget } from "@/features/orders/types";
import type { ProductId } from "@/features/products/types";
import { formatCurrency } from "@/lib/format";
import type { CartLine } from "../hooks/use-pos-catalog";
import { CartItemCard } from "./cart-item-card";
import { OrderNoteInput } from "./order-note-input";
import { TabModeBanner } from "./tab-mode-banner";

type CartPanelProps = {
  cartLines: readonly CartLine[];
  note: string;
  isSendingToKitchen: boolean;
  onNoteChange: (note: string) => void;
  onDecrement: (productId: ProductId) => void;
  onSendToKitchen: () => void;
  onQuickPayment: () => void;
  tabTarget: OrderTabTarget | null;
  isAddingToTab: boolean;
  onAddToTab: () => void;
  onExitTabMode: () => void;
};

export function CartPanel({
  cartLines,
  note,
  isSendingToKitchen,
  onNoteChange,
  onDecrement,
  onSendToKitchen,
  onQuickPayment,
  tabTarget,
  isAddingToTab,
  onAddToTab,
  onExitTabMode,
}: CartPanelProps) {
  const orderTotal = cartLines.reduce(
    (total, cartLine) => total + cartLine.total,
    0,
  );
  const isEmpty = cartLines.length === 0;

  return (
    <aside
      aria-label="Pedido atual"
      className="flex h-svh w-full shrink-0 flex-col border-l bg-muted/40 lg:w-[380px] xl:w-[400px]"
    >
      {tabTarget && (
        <TabModeBanner
          customerName={tabTarget.customerName}
          isDisabled={isAddingToTab}
          onExit={onExitTabMode}
        />
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {isEmpty ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShoppingCart aria-hidden />
              </EmptyMedia>
              <EmptyTitle>Nenhum item ainda</EmptyTitle>
              <EmptyDescription>
                Toque em um produto para adicionar ao pedido.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {cartLines.map((cartLine) => (
              <CartItemCard
                key={cartLine.product.id}
                cartLine={cartLine}
                onDecrement={onDecrement}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="flex flex-col gap-4 border-t bg-background px-6 py-5">
        <OrderNoteInput note={note} onNoteChange={onNoteChange} />
        <div className="flex items-baseline justify-between">
          <span className="font-semibold text-base">Total</span>
          <span className="font-bold text-[19px] tabular-nums tracking-[-0.01em]">
            {formatCurrency(orderTotal)}
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {tabTarget ? (
            <Button
              type="button"
              className="h-12 rounded-xl font-semibold text-[15px]"
              disabled={isEmpty || isAddingToTab}
              aria-busy={isAddingToTab}
              onClick={onAddToTab}
            >
              {isAddingToTab ? (
                <Spinner aria-hidden />
              ) : (
                <ClipboardPlus aria-hidden />
              )}
              Adicionar à comanda
            </Button>
          ) : (
            <>
              <Button
                type="button"
                className="h-12 rounded-xl font-semibold text-[15px]"
                disabled={isEmpty || isSendingToKitchen}
                aria-busy={isSendingToKitchen}
                onClick={onSendToKitchen}
              >
                {isSendingToKitchen ? (
                  <Spinner aria-hidden />
                ) : (
                  <Printer aria-hidden />
                )}
                Imprimir pedido
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl border-primary font-semibold text-[15px] text-primary hover:text-primary"
                disabled={isEmpty || isSendingToKitchen}
                onClick={onQuickPayment}
              >
                <CreditCard aria-hidden />
                Pagamento
              </Button>
            </>
          )}
        </div>
      </footer>
    </aside>
  );
}
