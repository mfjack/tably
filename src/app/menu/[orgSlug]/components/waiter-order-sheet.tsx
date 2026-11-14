"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type FormEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { NumberField } from "@/components/form/number-field";
import { TextField } from "@/components/form/text-field";
import { SearchInput } from "@/components/search-input";
import { ToggleChip } from "@/components/toggle-chip";
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
import { useAddOrderItemsMutation } from "@/features/orders/hooks/use-add-order-items-mutation";
import { useOpenOrderTabsQuery } from "@/features/orders/hooks/use-open-order-tabs-query";
import { filterOrdersBySearch } from "@/features/orders/order-search";
import type { OrderDetails, OrderId } from "@/features/orders/types";
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
  const addOrderItemsMutation = useAddOrderItemsMutation(organizationId);
  const openTabsQuery = useOpenOrderTabsQuery(organizationId, isOpen);
  const [selectedOrderId, setSelectedOrderId] = useState<OrderId | null>(null);
  const [tabSearch, setTabSearch] = useState("");
  const openTabs = openTabsQuery.data ?? [];
  const visibleTabs = filterOrdersBySearch(openTabs, tabSearch);
  const selectedOrder =
    openTabs.find((order) => order.id === selectedOrderId) ?? null;
  const isSending =
    placeWaiterOrderMutation.isPending || addOrderItemsMutation.isPending;
  const orderItems = cartLines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    note: line.note,
    addonIds: line.addonIds,
  }));

  function finishOrder() {
    toast.success("Pedido enviado.", { description: "Já está na cozinha." });
    clearCart(menuSlug);
    form.reset({ customerName: "" });
    setSelectedOrderId(null);
    setTabSearch("");
    onOpenChange(false);
  }

  function sendToSelectedOrder(order: OrderDetails) {
    addOrderItemsMutation.mutate(
      {
        orderId: order.id,
        items: orderItems,
        request: { requestId: crypto.randomUUID() },
      },
      {
        onSuccess: finishOrder,
        onError: (error) => toast.error(error.message),
      },
    );
  }
  const form = useForm<WaiterOrderTableInput>({
    resolver: zodResolver(waiterOrderTableSchema),
    defaultValues: { customerName: "" },
  });

  const submitNewOrder = form.handleSubmit((values) => {
    placeWaiterOrderMutation.mutate(
      { ...values, items: orderItems },
      {
        onSuccess: finishOrder,
        onError: (error) => toast.error(error.message),
      },
    );
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (selectedOrder) {
      event.preventDefault();
      sendToSelectedOrder(selectedOrder);
      return;
    }
    void submitNewOrder(event);
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-t-3xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Pedido</SheetTitle>
            <SheetDescription>
              Escolha uma comanda aberta ou abra uma nova. Vai direto para a
              cozinha.
            </SheetDescription>
          </SheetHeader>

          <MenuCartLines menuSlug={menuSlug} cartLines={cartLines} />

          <section className="flex flex-col gap-2 px-4">
            <h3 className="font-medium text-sm">Comanda</h3>
            {openTabs.length > 0 && (
              <SearchInput
                label="Buscar comanda pelo nome ou mesa"
                value={tabSearch}
                onValueChange={setTabSearch}
              />
            )}
            <div className="flex flex-wrap gap-2">
              <ToggleChip
                label="Nova comanda"
                isSelected={selectedOrderId === null}
                onToggle={() => setSelectedOrderId(null)}
              />
              {visibleTabs.map((order) => (
                <ToggleChip
                  key={order.id}
                  label={order.customerName ?? "Sem nome"}
                  isSelected={selectedOrderId === order.id}
                  onToggle={() => setSelectedOrderId(order.id)}
                />
              ))}
            </div>
          </section>

          {!selectedOrder && (
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
                label="Nome do cliente"
                placeholder="Ex.: Ana"
                autoComplete="off"
              />
            </FieldGroup>
          )}

          <SheetFooter>
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full justify-between"
              disabled={isSending}
            >
              <span>{isSending ? "Enviando..." : "Enviar para a cozinha"}</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
