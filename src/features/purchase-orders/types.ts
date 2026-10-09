import type { IngredientId, MeasureUnit } from "@/features/ingredients/types";
import type { SupplierId } from "@/features/suppliers/types";
import type { Brand } from "@/lib/brand";

export type PurchaseOrderId = Brand<string, "PurchaseOrderId">;

export type PurchaseOrderItem = {
  ingredientId: IngredientId;
  ingredientName: string;
  unit: MeasureUnit;
  quantity: number;
  unitCost: number;
  packageName: string | null;
  packageSize: number | null;
};

export type PurchaseOrder = {
  id: PurchaseOrderId;
  supplierId: SupplierId | null;
  supplierName: string | null;
  createdAt: string;
  createdByName: string | null;
  items: PurchaseOrderItem[];
};
