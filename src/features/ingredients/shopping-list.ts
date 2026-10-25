import { format } from "date-fns";
import {
  buildBusinessHeader,
  buildRow,
  type OrderTicketBusiness,
  TICKET_STYLES,
} from "@/features/orders/print-order-ticket";
import type { Product } from "@/features/products/types";
import { getPurchasableItemKey } from "@/features/purchase-orders/item-reference";
import type { PurchasableItemReference } from "@/features/purchase-orders/types";
import type { SupplierId } from "@/features/suppliers/types";
import { formatQuantity } from "@/lib/format";
import { escapeHtml, printHtml } from "@/lib/print-html";
import { getStockStatus, getUnitSymbol } from "./measure-units";
import type { Ingredient, MeasureUnit } from "./types";

export type PurchasableItem = PurchasableItemReference & {
  key: string;
  name: string;
  unit: MeasureUnit;
  currentStock: number;
  minimumStock: number;
  supplierId: SupplierId | null;
};

export type ShoppingListSupplier = {
  id: SupplierId;
  name: string;
  phone: string | null;
  contactName: string | null;
};

export type ShoppingListGroup = {
  supplier: ShoppingListSupplier | null;
  items: PurchasableItem[];
};

export type OrderedItem = PurchasableItem & { quantity: number };

export function isRunningLow(
  item: Pick<Ingredient, "currentStock" | "minimumStock">,
): boolean {
  return getStockStatus(item) !== "ok";
}

export function needsPurchase(item: PurchasableItem): boolean {
  return item.minimumStock > 0 && isRunningLow(item);
}

export function getPurchasableItems(
  ingredients: readonly Ingredient[],
  products: readonly Product[],
): PurchasableItem[] {
  const purchasableIngredients = ingredients
    .filter((ingredient) => !ingredient.isPrepared)
    .map(
      (ingredient): PurchasableItem => ({
        kind: "ingredient",
        id: ingredient.id,
        key: getPurchasableItemKey("ingredient", ingredient.id),
        name: ingredient.name,
        unit: ingredient.unit,
        currentStock: ingredient.currentStock,
        minimumStock: ingredient.minimumStock,
        supplierId: ingredient.supplierId,
      }),
    );
  const purchasableProducts = products.flatMap((product): PurchasableItem[] =>
    product.stockQuantity === null
      ? []
      : [
          {
            kind: "product",
            id: product.id,
            key: getPurchasableItemKey("product", product.id),
            name: product.name,
            unit: "unit",
            currentStock: product.stockQuantity,
            minimumStock: product.minimumStock,
            supplierId: product.supplierId,
          },
        ],
  );
  return [...purchasableIngredients, ...purchasableProducts];
}

export type ShoppingLine = {
  itemKey: string;
  supplierId: SupplierId | null;
};

const NO_SUPPLIER_GROUP_KEY = "none";

export function getShoppingGroupKey(supplierId: SupplierId | null): string {
  return supplierId ?? NO_SUPPLIER_GROUP_KEY;
}

export function toShoppingLine(item: PurchasableItem): ShoppingLine {
  return { itemKey: item.key, supplierId: item.supplierId };
}

export function getInitialShoppingLines(
  items: readonly PurchasableItem[],
): ShoppingLine[] {
  return items.filter(needsPurchase).map(toShoppingLine);
}

export function buildShoppingList(
  lines: readonly ShoppingLine[],
  items: readonly PurchasableItem[],
  suppliers: readonly ShoppingListSupplier[],
): ShoppingListGroup[] {
  const itemsByKey = new Map(items.map((item) => [item.key, item]));
  const suppliersById = new Map(
    suppliers.map((supplier) => [supplier.id, supplier]),
  );
  const groups = new Map<string, ShoppingListGroup>();

  for (const line of lines) {
    const item = itemsByKey.get(line.itemKey);
    if (!item) continue;
    const supplier = line.supplierId
      ? (suppliersById.get(line.supplierId) ?? null)
      : null;
    const groupKey = getShoppingGroupKey(supplier?.id ?? null);
    const group = groups.get(groupKey) ?? { supplier, items: [] };
    group.items.push(item);
    groups.set(groupKey, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((first, second) =>
        first.name.localeCompare(second.name, "pt-BR"),
      ),
    }))
    .sort((first, second) => {
      if (!first.supplier) return 1;
      if (!second.supplier) return -1;
      return first.supplier.name.localeCompare(second.supplier.name, "pt-BR");
    });
}

export function formatItemQuantity(
  quantity: number,
  unit: MeasureUnit,
): string {
  return `${formatQuantity(quantity)} ${getUnitSymbol(unit)}`;
}

function describeItem(item: OrderedItem): string {
  return `${formatItemQuantity(item.quantity, item.unit)} de ${item.name}`;
}

export function buildSupplierMessage(
  businessName: string,
  supplier: ShoppingListSupplier | null,
  items: readonly OrderedItem[],
): string {
  const greeting = supplier?.contactName
    ? `Olá, ${supplier.contactName}!`
    : "Olá!";
  return [
    `${greeting} Gostaria de fazer um pedido para ${businessName}:`,
    "",
    ...items.map((item) => `• ${describeItem(item)}`),
    "",
    "Pode me confirmar o valor e o prazo de entrega? Obrigado!",
  ].join("\n");
}

export function printShoppingList(
  business: OrderTicketBusiness,
  groups: readonly {
    supplierName: string | null;
    items: readonly OrderedItem[];
  }[],
  printedAt: Date,
): void {
  const sections = groups
    .map(
      (group) =>
        `<section>${group.supplierName ? `<p class="strong">${escapeHtml(group.supplierName)}</p>` : ""}${group.items
          .map((item) =>
            buildRow(item.name, formatItemQuantity(item.quantity, item.unit)),
          )
          .join("")}</section>`,
    )
    .join("");

  printHtml(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Lista de compras</title>
<style>${TICKET_STYLES}</style>
</head>
<body>
${buildBusinessHeader(business)}
<section><p class="strong">Lista de compras</p><p>${escapeHtml(format(printedAt, "dd/MM/yyyy HH:mm"))}</p></section>
${sections}
</body>
</html>`);
}
