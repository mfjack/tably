"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, MessageCircle, Printer } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { NumberField } from "@/components/form/number-field";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { getWhatsAppUrl } from "@/components/whatsapp-link";
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import {
  buildShoppingList,
  buildSupplierMessage,
  formatItemQuantity,
  type OrderedItem,
  printShoppingList,
  type ShoppingListGroup,
} from "@/features/ingredients/shopping-list";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { Supplier } from "@/features/suppliers/types";

const NO_SUPPLIER_LABEL = "Sem fornecedor definido";

const shoppingListSchema = z.object({
  quantities: z.record(z.string(), z.number().min(0).optional()),
});

type ShoppingListInput = z.infer<typeof shoppingListSchema>;

type ShoppingListDialogProps = {
  isOpen: boolean;
  ingredients: readonly Ingredient[];
  suppliers: readonly Supplier[];
  business: OrderTicketBusiness;
  onClose: () => void;
};

function getOrderedItems(
  group: ShoppingListGroup,
  quantities: ShoppingListInput["quantities"],
): OrderedItem[] {
  return group.items.flatMap((item) => {
    const quantity = quantities[item.ingredientId];
    return quantity && quantity > 0 ? [{ ...item, quantity }] : [];
  });
}

export function ShoppingListDialog({
  isOpen,
  ingredients,
  suppliers,
  business,
  onClose,
}: ShoppingListDialogProps) {
  const groups = useMemo(
    () => buildShoppingList(ingredients, suppliers),
    [ingredients, suppliers],
  );
  const form = useForm<ShoppingListInput>({
    resolver: zodResolver(shoppingListSchema),
    defaultValues: { quantities: {} },
  });
  const quantities = useWatch({ control: form.control, name: "quantities" });

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      quantities: Object.fromEntries(
        groups.flatMap((group) =>
          group.items.map((item) => [
            item.ingredientId,
            item.suggestedQuantity,
          ]),
        ),
      ),
    });
  }, [isOpen, groups, form]);

  const orderedGroups = groups.map((group) => ({
    group,
    items: getOrderedItems(group, quantities ?? {}),
  }));
  const hasOrderedItems = orderedGroups.some(({ items }) => items.length > 0);

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

  async function copyMessage(message: string) {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Lista copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
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
            disabled={!hasOrderedItems}
            onClick={printList}
          >
            <Printer aria-hidden />
            Imprimir lista
          </Button>
        </>
      }
    >
      {groups.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground text-sm">
          Nenhum insumo abaixo do estoque mínimo. Tudo em dia!
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-muted-foreground text-sm">
            Insumos no estoque mínimo ou abaixo dele. A quantidade sugerida
            repõe até o dobro do mínimo; ajuste se precisar. Deixe vazio para
            não pedir.
          </p>
          {orderedGroups.map(({ group, items }) => {
            const message = buildSupplierMessage(
              business.name,
              group.supplier,
              items,
            );
            return (
              <section
                key={group.supplier?.id ?? "none"}
                className="flex flex-col gap-3 rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    {group.supplier?.name ?? NO_SUPPLIER_LABEL}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={items.length === 0}
                      onClick={() => copyMessage(message)}
                    >
                      <Copy aria-hidden />
                      Copiar
                    </Button>
                    {group.supplier?.phone && (
                      <Button
                        size="sm"
                        disabled={items.length === 0}
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
                    )}
                  </div>
                </div>
                <ul className="flex flex-col divide-y">
                  {group.items.map((item) => (
                    <li
                      key={item.ingredientId}
                      className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 py-2"
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
                          Tem {formatItemQuantity(item.currentStock, item.unit)}{" "}
                          · mínimo{" "}
                          {formatItemQuantity(item.minimumStock, item.unit)}
                        </span>
                      </div>
                      <NumberField
                        control={form.control}
                        name={`quantities.${item.ingredientId}`}
                        label={`Quantidade de ${item.name}`}
                        isLabelHidden
                        format="quantity"
                        suffix={getUnitSymbol(item.unit)}
                        placeholder="Não pedir"
                        size="compact"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </DetailsDialog>
  );
}
