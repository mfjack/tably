"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ReceiptText, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PublicMenuItem } from "@/features/menu/types";
import { usePlaceOnlineOrderMutation } from "@/features/online-orders/hooks/use-place-online-order-mutation";
import {
  useHydratedMenuCartStore,
  useLatestRecentOrder,
  useMenuCartItems,
  useMenuCartStore,
} from "@/features/online-orders/menu-cart-store";
import {
  type OnlineOrderCustomerInput,
  onlineOrderCustomerSchema,
} from "@/features/online-orders/schemas";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MenuCartItemCard, type MenuCartLine } from "./menu-cart-item-card";
import { MenuItemNoteDialog } from "./menu-item-note-dialog";

type MenuOrderBarProps = {
  menuSlug: string;
  acceptsOrders: boolean;
  items: readonly PublicMenuItem[];
  className?: string;
};

function buildOrderPath(menuSlug: string, onlineOrderId: string) {
  return `/menu/${menuSlug}/orders/${onlineOrderId}`;
}

export function MenuOrderBar({
  menuSlug,
  acceptsOrders,
  items,
  className,
}: MenuOrderBarProps) {
  const router = useRouter();
  const isHydrated = useHydratedMenuCartStore();
  const cartItems = useMenuCartItems(menuSlug);
  const latestOrder = useLatestRecentOrder(menuSlug);
  const savedCustomerName = useMenuCartStore((state) => state.customerName);
  const decrementItem = useMenuCartStore((state) => state.decrementItem);
  const setItemNote = useMenuCartStore((state) => state.setItemNote);
  const clearCart = useMenuCartStore((state) => state.clearCart);
  const setCustomerName = useMenuCartStore((state) => state.setCustomerName);
  const addRecentOrder = useMenuCartStore((state) => state.addRecentOrder);
  const getDeviceId = useMenuCartStore((state) => state.getDeviceId);
  const placeOnlineOrderMutation = usePlaceOnlineOrderMutation(menuSlug);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [noteCartLine, setNoteCartLine] = useState<MenuCartLine | null>(null);

  const form = useForm<OnlineOrderCustomerInput>({
    resolver: zodResolver(onlineOrderCustomerSchema),
    values: { customerName: savedCustomerName },
    resetOptions: { keepDirtyValues: true },
  });

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

  const handleSubmit = form.handleSubmit((values) => {
    const onlineOrderId = pendingOrderId ?? crypto.randomUUID();
    setPendingOrderId(onlineOrderId);

    placeOnlineOrderMutation.mutate(
      {
        ...values,
        onlineOrderId,
        deviceId: getDeviceId(),
        items: cartLines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          note: line.note,
        })),
      },
      {
        onSuccess: (placedOrderId) => {
          setCustomerName(values.customerName);
          addRecentOrder(menuSlug, placedOrderId);
          clearCart(menuSlug);
          setPendingOrderId(null);
          setIsSheetOpen(false);
          router.push(buildOrderPath(menuSlug, placedOrderId));
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

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
              className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-black bg-white font-bold shadow-lg"
            >
              <ReceiptText className="size-5" aria-hidden />
              Acompanhar meu pedido
            </Link>
          )}
          {hasCartItems && (
            <button
              type="button"
              className="flex h-14 items-center justify-between gap-3 rounded-full bg-black px-6 font-bold text-white shadow-lg"
              onClick={() => setIsSheetOpen(true)}
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

      <Sheet open={isSheetOpen && hasCartItems} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-t-3xl"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <SheetHeader>
              <SheetTitle>Seu pedido</SheetTitle>
              <SheetDescription>
                Para comer aqui. O pagamento é feito no balcão.
              </SheetDescription>
            </SheetHeader>

            <ul className="flex flex-col gap-3 px-4">
              {cartLines.map((line) => (
                <MenuCartItemCard
                  key={`${line.productId}:${line.note}`}
                  cartLine={line}
                  onDecrement={(cartLine) =>
                    decrementItem(menuSlug, cartLine.productId, cartLine.note)
                  }
                  onEditNote={setNoteCartLine}
                />
              ))}
            </ul>

            <FieldGroup className="px-4">
              <TextField
                control={form.control}
                name="customerName"
                label="Seu nome"
                placeholder="Ex.: Ana"
                autoComplete="given-name"
                description="É por ele que vamos chamar você quando o pedido ficar pronto."
              />
            </FieldGroup>

            <SheetFooter>
              <Button
                type="submit"
                size="lg"
                className="h-12 w-full justify-between"
                disabled={placeOnlineOrderMutation.isPending}
              >
                <span>
                  {placeOnlineOrderMutation.isPending
                    ? "Enviando..."
                    : "Enviar pedido"}
                </span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      <MenuItemNoteDialog
        cartLine={noteCartLine}
        onClose={() => setNoteCartLine(null)}
        onSave={(cartLine, note, quantityToMove) =>
          setItemNote(
            menuSlug,
            cartLine.productId,
            cartLine.note,
            note,
            quantityToMove,
          )
        }
      />
    </>
  );
}
