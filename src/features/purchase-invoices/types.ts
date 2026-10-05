import type { IngredientId } from "@/features/ingredients/types";
import type { SupplierId } from "@/features/suppliers/types";

export type InvoiceSupplier = {
  taxId: string;
  name: string;
  phone: string | null;
};

export type InvoiceItem = {
  productCode: string;
  description: string;
  unit: string;
  packages: number;
  totalCost: number;
};

export type InvoiceInstallment = {
  dueDate: string;
  amount: number;
};

export type PurchaseInvoice = {
  accessKey: string;
  number: string;
  issuedAt: string;
  issuedDate: string;
  totalAmount: number;
  supplier: InvoiceSupplier;
  items: InvoiceItem[];
  installments: InvoiceInstallment[];
};

export type InvoiceItemSuggestion = {
  ingredientId: IngredientId | null;
  unitsPerPackage: number | null;
  isRemembered: boolean;
};

export type InvoicePreview = {
  supplierId: SupplierId | null;
  isAlreadyImported: boolean;
  suggestions: InvoiceItemSuggestion[];
};
