"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  ClipboardCheck,
  MessageCircle,
  PackageCheck,
  Printer,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { NumberField } from "@/components/form/number-field";
import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWhatsAppUrl } from "@/components/whatsapp-link";
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import {
  buildShoppingList,
  buildSupplierMessage,
  formatItemQuantity,
  getInitialShoppingLines,
  getShoppingGroupKey,
  type OrderedItem,
  type PurchasableItem,
  printShoppingList,
  type ShoppingLine,
  type ShoppingListGroup,
  toShoppingLine,
} from "@/features/ingredients/shopping-list";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { ReceivePurchaseOrderDialog } from "@/features/purchase-orders/components/receive-purchase-order-dialog";
import { useCancelPurchaseOrderMutation } from "@/features/purchase-orders/hooks/use-cancel-purchase-order-mutation";
import { useCreatePurchaseOrderMutation } from "@/features/purchase-orders/hooks/use-create-purchase-order-mutation";
import { usePendingPurchaseOrdersQuery } from "@/features/purchase-orders/hooks/use-pending-purchase-orders-query";
import type { PurchaseOrder } from "@/features/purchase-orders/types";
import type { Supplier, SupplierId } from "@/features/suppliers/types";
import { cn } from "@/lib/utils";

const NO_SUPPLIER_LABEL = "Sem fornecedor definido";

const SHOPPING_TABS = ["buy", "pending"] as const;

type ShoppingTab = (typeof SHOPPING_TABS)[number];

const shoppingListSchema = z.object({
  quantities: z.record(z.string(), z.number().min(0).optional()),
});

type ShoppingListInput = z.infer<typeof shoppingListSchema>;

type ShoppingListDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  canManage: boolean;
  items: readonly PurchasableItem[];
  suppliers: readonly Supplier[];
  business: OrderTicketBusiness;
  onClose: () => void;
};

function isShoppingTab(value: string): value is ShoppingTab {
  return SHOPPING_TABS.some((tab) => tab === value);
}

function getOrderedItems(
  group: ShoppingListGroup,
  quantities: ShoppingListInput["quantities"],
): OrderedItem[] {
  return group.items.flatMap((item) => {
    const quantity = quantities[item.key];
    return quantity && quantity > 0 ? [{ ...item, quantity }] : [];
  });
}

function describeGroupProgress(itemCount: number, orderedCount: number) {
  const itemsLabel = itemCount === 1 ? "1 item" : `${itemCount} itens`;
  if (orderedCount === 0) return `${itemsLabel} · digite as quantidades`;
  return `${itemsLabel} · ${orderedCount} para pedir`;
}

function describeOrderItems(order: PurchaseOrder): string {
  return order.items
    .map(
      (item) =>
        `${formatItemQuantity(item.quantity, item.unit)} de ${item.name}`,
    )
    .join(" · ");
}

export function ShoppingListDialog({
  organizationId,
  isOpen,
  canManage,
  items,
  suppliers,
  business,
  onClose,
}: ShoppingListDialogProps) {
  const [tab, setTab] = useState<ShoppingTab>("buy");
  const [lines, setLines] = useState<ShoppingLine[]>([]);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const ordersQuery = usePendingPurchaseOrdersQuery(organizationId);
  const createOrderMutation = useCreatePurchaseOrderMutation(organizationId);
  const cancelOrderMutation = useCancelPurchaseOrderMutation(organizationId);
  const form = useForm<ShoppingListInput>({
    resolver: zodResolver(shoppingListSchema),
    defaultValues: { quantities: {} },
  });
  const quantities = useWatch({ control: form.control, name: "quantities" });

  const wasOpenRef = useRef(false);

  useEffect(() => {
    const isOpening = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!isOpening) return;
    setTab("buy");
    setLines(getInitialShoppingLines(items));
    form.reset({ quantities: {} });
  }, [isOpen, items, form]);

  const pendingItemKeys = useMemo(
    () =>
      new Set(
        (ordersQuery.data ?? []).flatMap((order) =>
          order.items.map((item) => item.key),
        ),
      ),
    [ordersQuery.data],
  );
  const groups = useMemo(
    () =>
      buildShoppingList(
        lines.filter((line) => !pendingItemKeys.has(line.itemKey)),
        items,
        suppliers,
      ),
    [lines, items, suppliers, pendingItemKeys],
  );
  const orderedGroups = groups.map((group) => ({
    group,
    groupKey: getShoppingGroupKey(group.supplier?.id ?? null),
    items: getOrderedItems(group, quantities ?? {}),
  }));
  const hasOrderedItems = orderedGroups.some(({ items }) => items.length > 0);
  const pendingOrders = ordersQuery.data ?? [];

  const addableItemOptions = useMemo(() => {
    const listedKeys = new Set(lines.map((line) => line.itemKey));
    return items
      .filter(
        (item) => !listedKeys.has(item.key) && !pendingItemKeys.has(item.key),
      )
      .map((item) => ({ value: item.key, label: item.name }));
  }, [items, lines, pendingItemKeys]);

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
    [suppliers],
  );

  function addItem(itemKey: string) {
    const item = items.find(({ key }) => key === itemKey);
    if (!item) return;
    setLines((currentLines) => [...currentLines, toShoppingLine(item)]);
  }

  function removeItem(itemKey: string) {
    setLines((currentLines) =>
      currentLines.filter((line) => line.itemKey !== itemKey),
    );
    form.setValue(`quantities.${itemKey}`, undefined);
  }

  function assignSupplier(itemKey: string, supplierId: string) {
    setLines((currentLines) =>
      currentLines.map((line) =>
        line.itemKey === itemKey
          ? { ...line, supplierId: supplierId as SupplierId }
          : line,
      ),
    );
  }

  function markAsOrdered(
    supplierId: SupplierId | null,
    orderedItems: readonly OrderedItem[],
  ) {
    if (orderedItems.length === 0) return;
    createOrderMutation.mutate(
      {
        supplierId,
        items: orderedItems.map((item) => ({
          kind: item.kind,
          id: item.id,
          quantity: item.quantity,
        })),
      },
      {
        onSuccess: () =>
          toast.success("Pedido feito. Está em Aguardando entrega."),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function printList() {
    printShoppingList(
      business,
      orderedGroups
        .filter(({ items }) => items.length > 0)
        .map(({ group, items }) => ({
          supplierName: group.supplier?.name ?? null,
          items,
        })),
      new Date(),
    );
  }

  if (isOpen && receivingOrder) {
    return (
      <ReceivePurchaseOrderDialog
        organizationId={organizationId}
        order={receivingOrder}
        onClose={() => setReceivingOrder(null)}
      />
    );
  }

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Lista de compras"
      size="large"
      footer={
        <>
          <DialogClose
            render={
              <Button
                variant="outline"
                className={cn(
                  DIALOG_ACTION_BUTTON_CLASS_NAME,
                  tab !== "buy" && "col-span-2",
                )}
              />
            }
          >
            Fechar
          </DialogClose>
          {tab === "buy" && (
            <Button
              className={DIALOG_ACTION_BUTTON_CLASS_NAME}
              disabled={!hasOrderedItems}
              onClick={printList}
            >
              <Printer aria-hidden />
              Imprimir lista
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Tabs
          value={tab}
          onValueChange={(value: string) => {
            if (isShoppingTab(value)) setTab(value);
          }}
        >
          <TabsList className="w-full group-data-horizontal/tabs:h-10">
            <TabsTrigger value="buy">Comprar</TabsTrigger>
            <TabsTrigger value="pending">
              Aguardando entrega
              {pendingOrders.length > 0 && (
                <span className="text-muted-foreground tabular-nums">
                  {pendingOrders.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "buy" ? (
          <>
            <p className="text-muted-foreground text-sm">
              Já vêm os insumos e produtos no estoque mínimo ou abaixo dele.
              Digite quanto pedir de cada um ou adicione outros. Depois de
              pedir, toque em Pedido feito: os itens saem daqui e vão para
              Aguardando entrega.
            </p>
            {addableItemOptions.length > 0 && (
              <OptionSelect
                label="Adicionar item ao pedido"
                placeholder="Adicionar outro insumo ou produto"
                options={addableItemOptions}
                value={null}
                onValueChange={addItem}
              />
            )}
            {groups.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground text-sm">
                Nenhum item abaixo do estoque mínimo. Adicione acima o que
                quiser pedir.
              </p>
            ) : (
              orderedGroups.map(({ group, groupKey, items }) => {
                const supplierId = group.supplier?.id ?? null;
                const message = buildSupplierMessage(
                  business.name,
                  group.supplier,
                  items,
                );
                return (
                  <section
                    key={groupKey}
                    className="overflow-hidden rounded-xl border bg-card"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        {group.supplier ? (
                          <h3 className="truncate font-semibold">
                            {group.supplier.name}
                          </h3>
                        ) : (
                          <h3 className="font-semibold">{NO_SUPPLIER_LABEL}</h3>
                        )}
                        <p className="text-muted-foreground text-xs">
                          {describeGroupProgress(
                            group.items.length,
                            items.length,
                          )}
                          {group.supplier &&
                            !group.supplier.phone &&
                            " · sem telefone para WhatsApp"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {group.supplier?.phone &&
                          (items.length === 0 ? (
                            <Button size="sm" disabled>
                              <MessageCircle aria-hidden />
                              WhatsApp
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              nativeButton={false}
                              render={
                                <a
                                  href={`${getWhatsAppUrl(group.supplier.phone)}?text=${encodeURIComponent(message)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                />
                              }
                            >
                              <MessageCircle aria-hidden />
                              WhatsApp
                            </Button>
                          ))}
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-background"
                          disabled={items.length === 0}
                          isLoading={
                            createOrderMutation.isPending &&
                            createOrderMutation.variables?.supplierId ===
                              supplierId
                          }
                          onClick={() => markAsOrdered(supplierId, items)}
                        >
                          <ClipboardCheck aria-hidden />
                          Pedido feito
                        </Button>
                      </div>
                    </header>
                    <ul className="flex flex-col divide-y">
                      {group.items.map((item) => {
                        const isBelowMinimum =
                          item.currentStock <= item.minimumStock;
                        return (
                          <li
                            key={item.key}
                            className="flex flex-col gap-2 px-4 py-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate font-medium text-sm">
                                  {item.name}
                                </span>
                                <span className="text-xs tabular-nums">
                                  <span
                                    className={
                                      isBelowMinimum
                                        ? "font-medium text-destructive"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {formatItemQuantity(
                                      item.currentStock,
                                      item.unit,
                                    )}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {" "}
                                    / mín.{" "}
                                    {formatItemQuantity(
                                      item.minimumStock,
                                      item.unit,
                                    )}
                                  </span>
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                aria-label={`Tirar ${item.name} da lista`}
                                onClick={() => removeItem(item.key)}
                              >
                                <X aria-hidden />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              {supplierOptions.length > 0 && (
                                <OptionSelect
                                  label={`Fornecedor de ${item.name}`}
                                  placeholder="Escolher fornecedor"
                                  options={supplierOptions}
                                  value={group.supplier?.id ?? null}
                                  className="h-9 min-w-0 flex-1 data-[size=default]:h-9"
                                  onValueChange={(supplierId) =>
                                    assignSupplier(item.key, supplierId)
                                  }
                                />
                              )}
                              <div className="ml-auto w-28 shrink-0">
                                <NumberField
                                  control={form.control}
                                  name={`quantities.${item.key}`}
                                  label={`Quantidade de ${item.name}`}
                                  isLabelHidden
                                  format={
                                    item.kind === "product"
                                      ? "integer"
                                      : "quantity"
                                  }
                                  suffix={getUnitSymbol(item.unit)}
                                  placeholder="Qtd."
                                  size="dense"
                                />
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })
            )}
          </>
        ) : pendingOrders.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            Nenhum pedido aguardando entrega. Os pedidos enviados pelo WhatsApp
            ou copiados aparecem aqui.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {pendingOrders.map((order) => (
              <li
                key={order.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium text-sm">
                    {order.supplierName ?? NO_SUPPLIER_LABEL}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}
                    {order.createdByName && ` · ${order.createdByName}`}
                  </span>
                  <span className="text-sm">{describeOrderItems(order)}</span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Cancelar pedido"
                    disabled={cancelOrderMutation.isPending}
                    onClick={() =>
                      cancelOrderMutation.mutate(order.id, {
                        onSuccess: () => toast.success("Pedido cancelado."),
                        onError: (error) => toast.error(error.message),
                      })
                    }
                  >
                    <X aria-hidden />
                    Cancelar
                  </Button>
                  {canManage && (
                    <Button size="sm" onClick={() => setReceivingOrder(order)}>
                      <PackageCheck aria-hidden />
                      Receber
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DetailsDialog>
  );
}
