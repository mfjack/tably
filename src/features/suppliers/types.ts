import type { Brand } from "@/lib/brand";

export type SupplierId = Brand<string, "SupplierId">;

export type SupplierSummary = {
  id: SupplierId;
  name: string;
};
