"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MaskedField } from "@/components/form/masked-field";
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
import type { PublicLoyaltyProgram } from "@/features/menu/types";
import { usePlaceOnlineOrderMutation } from "@/features/online-orders/hooks/use-place-online-order-mutation";
import { useMenuCartStore } from "@/features/online-orders/menu-cart-store";
import { ONLINE_ORDER_NAME_IN_USE_MESSAGE } from "@/features/online-orders/messages";
import {
  type OnlineOrderCustomerInput,
  onlineOrderCustomerSchema,
} from "@/features/online-orders/schemas";
import { formatCurrency } from "@/lib/format";
import type { MenuCartLine } from "./menu-cart-item-card";
import { MenuCartLines } from "./menu-cart-lines";
import { MenuOrderLoyaltyHint } from "./menu-order-loyalty-hint";
import { buildOrderPath } from "./menu-order-path";

type MenuOrderSheetProps = {
  menuSlug: string;
  loyaltyProgram: PublicLoyaltyProgram | null;
  cartLines: readonly MenuCartLine[];
  total: number;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function MenuOrderSheet({
  menuSlug,
  loyaltyProgram,
  cartLines,
  total,
  isOpen,
  onOpenChange,
}: MenuOrderSheetProps) {
  const router = useRouter();
  const savedCustomerName = useMenuCartStore((state) => state.customerName);
  const savedCustomerPhone = useMenuCartStore((state) => state.customerPhone);
  const setCustomerPhone = useMenuCartStore((state) => state.setCustomerPhone);
  const clearCart = useMenuCartStore((state) => state.clearCart);
  const setCustomerName = useMenuCartStore((state) => state.setCustomerName);
  const addRecentOrder = useMenuCartStore((state) => state.addRecentOrder);
  const getDeviceId = useMenuCartStore((state) => state.getDeviceId);
  const placeOnlineOrderMutation = usePlaceOnlineOrderMutation(menuSlug);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const form = useForm<OnlineOrderCustomerInput>({
    resolver: zodResolver(onlineOrderCustomerSchema),
    values: {
      customerName: savedCustomerName,
      customerPhone: loyaltyProgram ? savedCustomerPhone : "",
    },
    resetOptions: { keepDirtyValues: true },
  });

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
          addonIds: line.addonIds,
        })),
      },
      {
        onSuccess: (placedOrderId) => {
          setCustomerName(values.customerName);
          if (loyaltyProgram) setCustomerPhone(values.customerPhone);
          addRecentOrder(menuSlug, placedOrderId);
          clearCart(menuSlug);
          setPendingOrderId(null);
          onOpenChange(false);
          router.push(buildOrderPath(menuSlug, placedOrderId));
        },
        onError: (error) => {
          if (error.message === ONLINE_ORDER_NAME_IN_USE_MESSAGE) {
            setPendingOrderId(null);
            form.setError("customerName", { message: error.message });
            form.setFocus("customerName");
            return;
          }
          toast.error(error.message);
        },
      },
    );
  });

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-t-3xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Seu pedido</SheetTitle>
            <SheetDescription>
              Para comer aqui. Você paga no balcão quando terminar.
            </SheetDescription>
          </SheetHeader>

          <MenuCartLines menuSlug={menuSlug} cartLines={cartLines} />

          <FieldGroup className="px-4">
            <TextField
              control={form.control}
              name="customerName"
              label="Seu nome"
              placeholder="Ex.: Ana"
              autoComplete="given-name"
              description="É por ele que vamos chamar você quando o pedido ficar pronto."
            />
            {loyaltyProgram && (
              <MaskedField
                control={form.control}
                name="customerPhone"
                label="Celular para a fidelidade"
                description={`Opcional. Junte ${loyaltyProgram.stampsRequired} selos e ganhe ${loyaltyProgram.rewardDescription}.`}
                isDescriptionCompact
                mask="phone"
                placeholder="00 00000-0000"
                autoComplete="tel-national"
              />
            )}
            {loyaltyProgram && (
              <MenuOrderLoyaltyHint
                menuSlug={menuSlug}
                program={loyaltyProgram}
                control={form.control}
              />
            )}
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
  );
}
