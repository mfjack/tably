import type { PurchasableItemKind } from "./types";

export function getPurchasableItemKey(
  kind: PurchasableItemKind,
  id: string,
): string {
  return `${kind}-${id}`;
}

export function toItemReferenceColumns(
  kind: PurchasableItemKind,
  id: string,
): { ingredient_id: string } | { product_id: string } {
  return kind === "ingredient" ? { ingredient_id: id } : { product_id: id };
}
