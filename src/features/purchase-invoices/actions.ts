"use server";

import type { IngredientId } from "@/features/ingredients/types";
import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import type { SupplierId } from "@/features/suppliers/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  findSimilarIngredient,
  suggestUnitsPerPackage,
} from "./item-suggestions";
import {
  CREATE_INGREDIENT_TARGET,
  type InvoiceImportInput,
  invoiceImportSchema,
  purchaseInvoiceSchema,
  SKIP_ITEM_TARGET,
} from "./schemas";
import type { InvoicePreview, PurchaseInvoice } from "./types";

const INVALID_INVOICE_MESSAGE = "Não foi possível ler os dados da nota.";
const ALREADY_IMPORTED_CODE = "TB030";

export async function previewPurchaseInvoice(
  organizationId: OrganizationId,
  invoice: PurchaseInvoice,
): Promise<ActionResult<InvoicePreview>> {
  if (!(await hasModuleAccess(organizationId, "ingredients"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInvoice = purchaseInvoiceSchema.safeParse(invoice);
  if (!parsedInvoice.success) return actionFailure(INVALID_INVOICE_MESSAGE);

  const { accessKey, supplier, items } = parsedInvoice.data;
  const supabase = await createClient();
  const [supplierResult, importedResult, ingredientsResult] = await Promise.all(
    [
      supabase
        .from("suppliers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("tax_id", supplier.taxId)
        .maybeSingle(),
      supabase
        .from("purchase_invoices")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("access_key", accessKey)
        .maybeSingle(),
      supabase
        .from("ingredients")
        .select("id, name, unit")
        .eq("organization_id", organizationId)
        .order("name"),
    ],
  );

  if (supplierResult.error || importedResult.error || ingredientsResult.error) {
    return actionFailure("Não foi possível conferir a nota.");
  }

  const supplierId = supplierResult.data?.id ?? null;
  const { data: mappings } = supplierId
    ? await supabase
        .from("supplier_products")
        .select("product_code, ingredient_id, units_per_package")
        .eq("supplier_id", supplierId)
    : { data: [] };
  const ingredients = ingredientsResult.data;

  return actionSuccess({
    supplierId: supplierId as SupplierId | null,
    isAlreadyImported: importedResult.data !== null,
    suggestions: items.map((item) => {
      const mapping = (mappings ?? []).find(
        (candidate) => candidate.product_code === item.productCode,
      );
      if (mapping) {
        return {
          ingredientId: mapping.ingredient_id as IngredientId,
          unitsPerPackage: mapping.units_per_package,
          isRemembered: true,
        };
      }
      const similarIngredient = findSimilarIngredient(
        item.description,
        ingredients,
      );
      return {
        ingredientId: (similarIngredient?.id ?? null) as IngredientId | null,
        unitsPerPackage: similarIngredient
          ? suggestUnitsPerPackage(item.description, similarIngredient.unit)
          : null,
        isRemembered: false,
      };
    }),
  });
}

export async function importPurchaseInvoice(
  organizationId: OrganizationId,
  input: InvoiceImportInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "ingredients"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = invoiceImportSchema.safeParse(input);
  if (
    !parsedInput.success ||
    parsedInput.data.decisions.length !== parsedInput.data.invoice.items.length
  ) {
    return actionFailure(INVALID_INVOICE_MESSAGE);
  }

  const { invoice, decisions } = parsedInput.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("import_purchase_invoice", {
    p_organization_id: organizationId,
    p_invoice: {
      ...invoice,
      items: invoice.items.map((item, index) => {
        const decision = decisions[index];
        return {
          ...item,
          action:
            decision.target === SKIP_ITEM_TARGET
              ? "skip"
              : decision.target === CREATE_INGREDIENT_TARGET
                ? "create"
                : "link",
          ingredientId:
            decision.target === SKIP_ITEM_TARGET ||
            decision.target === CREATE_INGREDIENT_TARGET
              ? null
              : decision.target,
          newIngredient:
            decision.target === CREATE_INGREDIENT_TARGET
              ? { name: decision.newName, unit: decision.newUnit }
              : null,
          unitsPerPackage: decision.unitsPerPackage ?? null,
        };
      }),
    },
  });

  if (error?.code === ALREADY_IMPORTED_CODE) {
    return actionFailure("Essa nota já foi importada.");
  }
  if (error) return actionFailure("Não foi possível importar a nota.");
  return actionSuccess();
}
