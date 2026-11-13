"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { NumberField } from "@/components/form/number-field";
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
import { usePlaceWaiterOrderMutation } from "@/features/online-orders/hooks/use-place-waiter-order-mutation";
import { useMenuCartStore } from "@/features/online-orders/menu-cart-store";
import {
  type WaiterOrderTableInput,
  waiterOrderTableSchema,
} from "@/features/online-orders/schemas";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import type { MenuCartLine } from "./menu-cart-item-card";
import { MenuCartLines } from "./menu-cart-lines";

type WaiterOrderSheetProps = {
  menuSlug: string;
  organizationId: OrganizationId;
  cartLines: readonly MenuCartLine[];
  total: number;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function WaiterOrderSheet({
  menuSlug,
  organizationId,
  cartLines,
  total,
  isOpen,
  onOpenChange,
}: WaiterOrderSheetProps) {
  const clearCart = useMenuCartStore((state) => state.clearCart);
  const placeWaiterOrderMutation = usePlaceWaiterOrderMutation(organizationId);
  const form = useForm<WaiterOrderTableInput>({
    resolver: zodResolver(waiterOrderTableSchema),
    defaultValues: { customerName: "" },
  });

  const handleSubmit = form.handleSubmit((values) => {
    placeWaiterOrderMutation.mutate(
      {
        ...values,
        items: cartLines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          note: line.note,
          addonIds: line.addonIds,
        })),
      },
      {
        onSuccess: () => {
          toast.success(`Pedido da mesa ${values.tableNumber} enviado.`, {
            description: "Já está na cozinha.",
          });
          clearCart(menuSlug);
          form.reset({ customerName: "" });
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
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
            <SheetTitle>Pedido da mesa</SheetTitle>
            <SheetDescription>
              Vai direto para a cozinha. Se a mesa já tem conta aberta, os itens
              entram nela.
            </SheetDescription>
          </SheetHeader>

          <MenuCartLines menuSlug={menuSlug} cartLines={cartLines} />

          <FieldGroup className="grid gap-4 px-4 sm:grid-cols-2">
            <NumberField
              control={form.control}
              name="tableNumber"
              label="Mesa"
              format="integer"
              placeholder="Ex.: 5"
            />
            <TextField
              control={form.control}
              name="customerName"
              label="Nome do cliente (opcional)"
              placeholder="Ex.: Ana"
              autoComplete="off"
              description="Para separar a conta de cada pessoa na mesa."
            />
          </FieldGroup>

          <SheetFooter>
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full justify-between"
              disabled={placeWaiterOrderMutation.isPending}
            >
              <span>
                {placeWaiterOrderMutation.isPending
                  ? "Enviando..."
                  : "Enviar para a cozinha"}
              </span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
