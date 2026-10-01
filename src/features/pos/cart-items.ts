import type { ProductId } from "@/features/products/types";

export type CartItem = {
  productId: ProductId;
  quantity: number;
  note: string;
};

export const CART_ITEM_NOTE_MAX_LENGTH = 140;

export function getCartItemKey(item: Pick<CartItem, "productId" | "note">) {
  return `${item.productId}:${item.note}`;
}

function isSameLine(item: CartItem, productId: ProductId, note: string) {
  return item.productId === productId && item.note === note;
}

export function addToItems(
  items: CartItem[],
  productId: ProductId,
): CartItem[] {
  const hasLine = items.some((item) => isSameLine(item, productId, ""));

  return hasLine
    ? items.map((item) =>
        isSameLine(item, productId, "")
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      )
    : [...items, { productId, quantity: 1, note: "" }];
}

export function decrementFromItems(
  items: CartItem[],
  productId: ProductId,
  note: string,
): CartItem[] {
  return items
    .map((item) =>
      isSameLine(item, productId, note)
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
): CartItem[] {
  const normalizedNote = nextNote.trim().slice(0, CART_ITEM_NOTE_MAX_LENGTH);
  const editedItem = items.find((item) =>
    isSameLine(item, productId, currentNote),
  );
  if (!editedItem || normalizedNote === currentNote) return items;

  const movedQuantity = Math.min(
    Math.max(quantityToMove, 1),
    editedItem.quantity,
  );
  const remainingQuantity = editedItem.quantity - movedQuantity;
  const hasTargetLine = items.some((item) =>
    isSameLine(item, productId, normalizedNote),
  );

  if (hasTargetLine) {
    return items.flatMap((item) => {
      if (item === editedItem) {
        return remainingQuantity > 0
          ? [{ ...item, quantity: remainingQuantity }]
          : [];
      }
      return isSameLine(item, productId, normalizedNote)
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
