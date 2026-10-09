"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Copy, MessageCircle, PackageCheck, Printer, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { NumberField } from "@/components/form/number-field";
import { OptionSelect } from "@/components/option-select";
import { Badge } from "@/components/ui/badge";
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
  getSuggestedQuantities,
  type OrderedItem,
  printShoppingList,
  type ShoppingLine,
  type ShoppingListGroup,
} from "@/features/ingredients/shopping-list";
import type { Ingredient, IngredientId } from "@/features/ingredients/types";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useCancelPurchaseOrderMutation } from "@/features/purchase-orders/hooks/use-cancel-purchase-order-mutation";
import { useCreatePurchaseOrderMutation } from "@/features/purchase-orders/hooks/use-create-purchase-order-mutation";
import { usePendingPurchaseOrdersQuery } from "@/features/purchase-orders/hooks/use-pending-purchase-orders-query";
import type { PurchaseOrder } from "@/features/purchase-orders/types";
import type { Supplier, SupplierId } from "@/features/suppliers/types";
import { ReceivePurchaseOrderDialog } from "./receive-purchase-order-dialog";

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
  ingredients: readonly Ingredient[];
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
    const quantity = quantities[item.ingredientId];
    return quantity && quantity > 0 ? [{ ...item, quantity }] : [];
  });
}

function describeOrderItems(order: PurchaseOrder): string {
  return order.items
    .map(
      (item) =>
        `${formatItemQuantity(item.quantity, item.unit)} de ${item.ingredientName}`,
    )
    .join(" · ");
}

export function ShoppingListDialog({
  organizationId,
  isOpen,
  canManage,
  ingredients,
  suppliers,
  business,
  onClose,
}: ShoppingListDialogProps) {
  const [tab, setTab] = useState<ShoppingTab>("buy");
  const [lines, setLines] = useState<ShoppingLine[]>([]);
  const [savedGroupKeys, setSavedGroupKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
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
    setLines(getInitialShoppingLines(ingredients));
    setSavedGroupKeys(new Set());
    form.reset({ quantities: getSuggestedQuantities(ingredients) });
  }, [isOpen, ingredients, form]);

  const groups = useMemo(
    () => buildShoppingList(lines, ingredients, suppliers),
    [lines, ingredients, suppliers],
  );
  const orderedGroups = groups.map((group) => ({
    group,
    groupKey: getShoppingGroupKey(group.supplier?.id ?? null),
    items: getOrderedItems(group, quantities ?? {}),
  }));
  const hasOrderedItems = orderedGroups.some(({ items }) => items.length > 0);
  const pendingOrders = ordersQuery.data ?? [];

  const addableIngredientOptions = useMemo(() => {
    const listedIds = new Set(lines.map((line) => line.ingredientId));
    return ingredients
      .filter(
        (ingredient) => !ingredient.isPrepared && !listedIds.has(ingredient.id),
      )
      .map((ingredient) => ({ value: ingredient.id, label: ingredient.name }));
  }, [ingredients, lines]);

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
    [suppliers],
  );

  function addIngredient(ingredientId: string) {
    const ingredient = ingredients.find(({ id }) => id === ingredientId);
    if (!ingredient) return;
    setLines((currentLines) => [
      ...currentLines,
      { ingredientId: ingredient.id, supplierId: ingredient.supplierId },
    ]);
  }

  function removeIngredient(ingredientId: IngredientId) {
    setLines((currentLines) =>
      currentLines.filter((line) => line.ingredientId !== ingredientId),
    );
    form.setValue(`quantities.${ingredientId}`, undefined);
  }

  function assignSupplier(supplierId: string) {
    setLines((currentLines) =>
      currentLines.map((line) =>
        line.supplierId === null
          ? { ...line, supplierId: supplierId as SupplierId }
          : line,
      ),
    );
  }

  function saveOrder(
    groupKey: string,
    supplierId: SupplierId | null,
    items: readonly OrderedItem[],
  ) {
    if (savedGroupKeys.has(groupKey) || items.length === 0) return;
    createOrderMutation.mutate(
      {
        supplierId,
        items: items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity,
        })),
      },
      {
        onSuccess: () => {
          setSavedGroupKeys((currentKeys) =>
            new Set(currentKeys).add(groupKey),
          );
          toast.success("Pedido salvo em Aguardando entrega.");
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  async function copyMessage(
    groupKey: string,
    supplierId: SupplierId | null,
    items: readonly OrderedItem[],
    message: string,
  ) {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Lista copiada.");
      saveOrder(groupKey, supplierId, items);
    } catch {
      toast.error("Não foi possível copiar.");
    }
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
                className={DIALOG_ACTION_BUTTON_CLASS_NAME}
              />
            }
          >
            Fechar
          </DialogClose>
          <Button
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            disabled={tab !== "buy" || !hasOrderedItems}
            onClick={printList}
          >
            <Printer aria-hidden />
            Imprimir lista
          </Button>
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
              Já vêm os insumos no estoque mínimo ou abaixo dele, com a
              quantidade para repor até o dobro do mínimo. Ajuste, deixe vazio
              para não pedir ou adicione outros insumos. Ao enviar pelo WhatsApp
              ou copiar, o pedido fica salvo em Aguardando entrega.
            </p>
            {addableIngredientOptions.length > 0 && (
              <OptionSelect
                label="Adicionar insumo ao pedido"
                placeholder="Adicionar outro insumo"
                options={addableIngredientOptions}
                value={null}
                onValueChange={addIngredient}
              />
            )}
            {groups.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground text-sm">
                Nenhum insumo abaixo do estoque mínimo. Adicione acima o que
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
                const isSaved = savedGroupKeys.has(groupKey);
                return (
                  <section
                    key={groupKey}
                    className="flex flex-col gap-3 rounded-xl border p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {group.supplier ? (
                        <h3 className="flex items-center gap-2 font-semibold">
                          {group.supplier.name}
                          {isSaved && (
                            <Badge variant="secondary">Pedido salvo</Badge>
                          )}
                        </h3>
                      ) : (
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-xs">
                          <h3 className="font-semibold">{NO_SUPPLIER_LABEL}</h3>
                          {supplierOptions.length > 0 && (
                            <OptionSelect
                              label="Escolher fornecedor"
                              placeholder="Escolher fornecedor"
                              options={supplierOptions}
                              value={null}
                              onValueChange={assignSupplier}
                            />
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={items.length === 0}
                          onClick={() =>
                            copyMessage(groupKey, supplierId, items, message)
                          }
                        >
                          <Copy aria-hidden />
                          Copiar
                        </Button>
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
                                  onClick={() =>
                                    saveOrder(groupKey, supplierId, items)
                                  }
                                />
                              }
                            >
                              <MessageCircle aria-hidden />
                              WhatsApp
                            </Button>
                          ))}
                      </div>
                    </div>
                    <ul className="flex flex-col divide-y">
                      {group.items.map((item) => (
                        <li
                          key={item.ingredientId}
                          className="grid grid-cols-[minmax(0,1fr)_9rem_auto] items-center gap-2 py-2"
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium text-sm">
                              {item.name}
                              {item.brand && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {item.brand}
                                </span>
                              )}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              Tem{" "}
                              {formatItemQuantity(item.currentStock, item.unit)}{" "}
                              · mínimo{" "}
                              {formatItemQuantity(item.minimumStock, item.unit)}
                            </span>
                          </div>
                          <NumberField
                            control={form.control}
                            name={`quantities.${item.ingredientId as IngredientId}`}
                            label={`Quantidade de ${item.name}`}
                            isLabelHidden
                            format="quantity"
                            suffix={getUnitSymbol(item.unit)}
                            placeholder="Não pedir"
                            size="compact"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Tirar ${item.name} da lista`}
                            onClick={() => removeIngredient(item.ingredientId)}
                          >
                            <X aria-hidden />
                          </Button>
                        </li>
                      ))}
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
