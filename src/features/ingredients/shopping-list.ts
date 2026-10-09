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
import { formatPackageCount, formatPackageSize, hasPackage } from "./packages";
import type { Ingredient, IngredientId, MeasureUnit } from "./types";

export type ShoppingListItem = {
  ingredientId: IngredientId;
  name: string;
  brand: string | null;
  unit: MeasureUnit;
  currentStock: number;
  minimumStock: number;
  packageName: string | null;
  packageSize: number | null;
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

export type OrderedItem = ShoppingListItem & {
  quantity: number;
  packageCount: number | null;
};

export function isRunningLow(ingredient: Ingredient): boolean {
  return getStockStatus(ingredient) !== "ok";
}

export function needsPurchase(ingredient: Ingredient): boolean {
  return !ingredient.isPrepared && isRunningLow(ingredient);
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
  return ingredients.filter(needsPurchase).map((ingredient) => ({
    ingredientId: ingredient.id,
    supplierId: ingredient.supplierId,
  }));
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
      packageName: ingredient.packageName,
      packageSize: ingredient.packageSize,
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

export function formatOrderedQuantity(item: OrderedItem): string {
  if (item.packageCount !== null && hasPackage(item)) {
    return `${formatPackageCount(item.packageCount, item.packageName)} (${formatPackageSize(item)})`;
  }
  return formatItemQuantity(item.quantity, item.unit);
}

function describeItem(item: OrderedItem): string {
  const brand = item.brand ? ` (${item.brand})` : "";
  return `${formatOrderedQuantity(item)} de ${item.name}${brand}`;
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
              formatOrderedQuantity(item),
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
