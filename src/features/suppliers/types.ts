import type { MeasureUnit } from "@/features/ingredients/types";
import type { Brand } from "@/lib/brand";

export type SupplierId = Brand<string, "SupplierId">;

export type SupplierSummary = {
  id: SupplierId;
  name: string;
};

export type Supplier = SupplierSummary & {
  phone: string | null;
  contactName: string | null;
  suppliedItems: string | null;
  purchaseUrl: string | null;
  notes: string | null;
  totalSpent: number;
  entryCount: number;
  lastEntryAt: string | null;
};

export type SupplierPurchase = {
  id: string;
  ingredientName: string;
  quantity: number;
  unit: MeasureUnit;
  totalCost: number;
  enteredAt: string;
};
