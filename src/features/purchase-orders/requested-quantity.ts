import { formatItemQuantity } from "@/features/ingredients/shopping-list";
import type { PurchaseOrderItem } from "./types";

export function describeRequestedQuantity(
  item: Pick<PurchaseOrderItem, "requestedText" | "quantity" | "unit">,
): string {
  if (item.requestedText) return item.requestedText;
  return item.quantity === null
    ? "—"
    : formatItemQuantity(item.quantity, item.unit);
}
