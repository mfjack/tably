import { format } from "date-fns";
import {
  buildBusinessHeader,
  buildRow,
  type OrderTicketBusiness,
  TICKET_STYLES,
} from "@/features/orders/print-order-ticket";
import type { SupplierId } from "@/features/suppliers/types";
import { formatQuantity } from "@/lib/format";
import { escapeHtml, printHtml } from "@/lib/print-html";
import { getStockStatus, getUnitSymbol } from "./measure-units";
import type { Ingredient, IngredientId, MeasureUnit } from "./types";

const RESTOCK_MULTIPLIER = 2;
const QUANTITY_PRECISION = 1000;

export type ShoppingListItem = {
  ingredientId: IngredientId;
  name: string;
  brand: string | null;
  unit: MeasureUnit;
  currentStock: number;
  minimumStock: number;
  suggestedQuantity: number | undefined;
};

export type ShoppingListSupplier = {
  id: SupplierId;
  name: string;
  phone: string | null;
  contactName: string | null;
};

export type ShoppingListGroup = {
  supplier: ShoppingListSupplier | null;
  items: ShoppingListItem[];
};

export type OrderedItem = ShoppingListItem & { quantity: number };

function getSuggestedQuantity(ingredient: Ingredient): number | undefined {
  const target = ingredient.minimumStock * RESTOCK_MULTIPLIER;
  const missing = target - Math.max(ingredient.currentStock, 0);
  if (missing <= 0) return undefined;
  return Math.ceil(missing * QUANTITY_PRECISION) / QUANTITY_PRECISION;
}

export function isRunningLow(ingredient: Ingredient): boolean {
  return getStockStatus(ingredient) !== "ok";
}

export type ShoppingLine = {
  ingredientId: IngredientId;
  supplierId: SupplierId | null;
};

export const NO_SUPPLIER_GROUP_KEY = "none";

export function getShoppingGroupKey(supplierId: SupplierId | null): string {
  return supplierId ?? NO_SUPPLIER_GROUP_KEY;
}

export function getInitialShoppingLines(
  ingredients: readonly Ingredient[],
): ShoppingLine[] {
  return ingredients.filter(isRunningLow).map((ingredient) => ({
    ingredientId: ingredient.id,
    supplierId: ingredient.supplierId,
  }));
}

export function getSuggestedQuantities(
  ingredients: readonly Ingredient[],
): Record<string, number | undefined> {
  return Object.fromEntries(
    ingredients
      .filter(isRunningLow)
      .map((ingredient) => [ingredient.id, getSuggestedQuantity(ingredient)]),
  );
}

export function buildShoppingList(
  lines: readonly ShoppingLine[],
  ingredients: readonly Ingredient[],
  suppliers: readonly ShoppingListSupplier[],
): ShoppingListGroup[] {
  const ingredientsById = new Map(
    ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );
  const suppliersById = new Map(
    suppliers.map((supplier) => [supplier.id, supplier]),
  );
  const groups = new Map<string, ShoppingListGroup>();

  for (const line of lines) {
    const ingredient = ingredientsById.get(line.ingredientId);
    if (!ingredient) continue;
    const supplier = line.supplierId
      ? (suppliersById.get(line.supplierId) ?? null)
      : null;
    const groupKey = getShoppingGroupKey(supplier?.id ?? null);
    const group = groups.get(groupKey) ?? { supplier, items: [] };
    group.items.push({
      ingredientId: ingredient.id,
      name: ingredient.name,
      brand: ingredient.brand,
      unit: ingredient.unit,
      currentStock: ingredient.currentStock,
      minimumStock: ingredient.minimumStock,
      suggestedQuantity: getSuggestedQuantity(ingredient),
    });
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
  const brand = item.brand ? ` (${item.brand})` : "";
  return `${formatItemQuantity(item.quantity, item.unit)} de ${item.name}${brand}`;
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
            buildRow(
              `${item.name}${item.brand ? ` (${item.brand})` : ""}`,
              formatItemQuantity(item.quantity, item.unit),
            ),
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
