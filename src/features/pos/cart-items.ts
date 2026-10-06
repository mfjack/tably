import type { ProductId } from "@/features/products/types";

export type CartItem = {
  productId: ProductId;
  quantity: number;
  note: string;
  addonIds?: string[];
};

type CartItemIdentity = Pick<CartItem, "productId" | "note" | "addonIds">;

export const CART_ITEM_NOTE_MAX_LENGTH = 140;

function normalizeAddonIds(addonIds: readonly string[] = []): string[] {
  return [...new Set(addonIds)].sort();
}

function getAddonKey(addonIds?: readonly string[]) {
  return normalizeAddonIds(addonIds).join(",");
}

export function getCartItemKey(item: CartItemIdentity) {
  return `${item.productId}:${item.note}:${getAddonKey(item.addonIds)}`;
}

function isSameLine(
  item: CartItem,
  productId: ProductId,
  note: string,
  addonIds?: readonly string[],
) {
  return (
    item.productId === productId &&
    item.note === note &&
    getAddonKey(item.addonIds) === getAddonKey(addonIds)
  );
}

export function addToItems(
  items: CartItem[],
  productId: ProductId,
  addonIds: readonly string[] = [],
): CartItem[] {
  const hasLine = items.some((item) =>
    isSameLine(item, productId, "", addonIds),
  );

  return hasLine
    ? items.map((item) =>
        isSameLine(item, productId, "", addonIds)
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      )
    : [
        ...items,
        {
          productId,
          quantity: 1,
          note: "",
          addonIds: normalizeAddonIds(addonIds),
        },
      ];
}

export function decrementFromItems(
  items: CartItem[],
  productId: ProductId,
  note: string,
  addonIds?: readonly string[],
): CartItem[] {
  return items
    .map((item) =>
      isSameLine(item, productId, note, addonIds)
        ? { ...item, quantity: item.quantity - 1 }
        : item,
    )
    .filter((item) => item.quantity > 0);
}

export function updateItemNote(
  items: CartItem[],
  productId: ProductId,
  currentNote: string,
  nextNote: string,
  quantityToMove: number,
  addonIds?: readonly string[],
): CartItem[] {
  const normalizedNote = nextNote.trim().slice(0, CART_ITEM_NOTE_MAX_LENGTH);
  const editedItem = items.find((item) =>
    isSameLine(item, productId, currentNote, addonIds),
  );
  if (!editedItem || normalizedNote === currentNote) return items;

  const movedQuantity = Math.min(
    Math.max(quantityToMove, 1),
    editedItem.quantity,
  );
  const remainingQuantity = editedItem.quantity - movedQuantity;
  const hasTargetLine = items.some((item) =>
    isSameLine(item, productId, normalizedNote, addonIds),
  );

  if (hasTargetLine) {
    return items.flatMap((item) => {
      if (item === editedItem) {
        return remainingQuantity > 0
          ? [{ ...item, quantity: remainingQuantity }]
          : [];
      }
      return isSameLine(item, productId, normalizedNote, addonIds)
        ? [{ ...item, quantity: item.quantity + movedQuantity }]
        : [item];
    });
  }

  return items.flatMap((item) => {
    if (item !== editedItem) return [item];
    const movedItem = {
      ...item,
      note: normalizedNote,
      quantity: movedQuantity,
    };
    return remainingQuantity > 0
      ? [{ ...item, quantity: remainingQuantity }, movedItem]
      : [movedItem];
  });
}
