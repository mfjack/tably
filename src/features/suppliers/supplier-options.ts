import type { SupplierId } from "./types";

export const NO_SUPPLIER_VALUE = "none";

export function toSupplierFieldValue(supplierId: SupplierId | null): string {
  return supplierId ?? NO_SUPPLIER_VALUE;
}

export function toSupplierId(fieldValue?: string): SupplierId | undefined {
  return fieldValue && fieldValue !== NO_SUPPLIER_VALUE
    ? (fieldValue as SupplierId)
    : undefined;
}
