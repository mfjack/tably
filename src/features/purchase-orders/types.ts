import type { IngredientId, MeasureUnit } from "@/features/ingredients/types";
import type { ProductId } from "@/features/products/types";
import type { SupplierId } from "@/features/suppliers/types";
import type { Brand } from "@/lib/brand";

export type PurchaseOrderId = Brand<string, "PurchaseOrderId">;

export const PURCHASABLE_ITEM_KINDS = ["ingredient", "product"] as const;

export type PurchasableItemKind = (typeof PURCHASABLE_ITEM_KINDS)[number];

export type PurchasableItemReference =
  | { kind: "ingredient"; id: IngredientId }
  | { kind: "product"; id: ProductId };

export type PurchaseOrderItem = PurchasableItemReference & {
  key: string;
  name: string;
  unit: MeasureUnit;
  quantity: number;
  unitCost: number;
};

export type PurchaseOrder = {
  id: PurchaseOrderId;
  supplierId: SupplierId | null;
  supplierName: string | null;
  createdAt: string;
  createdByName: string | null;
  items: PurchaseOrderItem[];
};
