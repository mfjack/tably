"use server";

import {
  hasModuleAccess,
  hasModuleAccessToRecord,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { type SupplierInput, supplierSchema } from "./schemas";
import type {
  Supplier,
  SupplierId,
  SupplierPurchase,
  SupplierSummary,
} from "./types";

const SUPPLIER_PURCHASES_LIMIT = 200;
const UNIQUE_VIOLATION_CODE = "23505";

export async function listSupplierSummaries(
  organizationId: OrganizationId,
): Promise<ActionResult<SupplierSummary[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");

  if (error)
    return databaseFailure("Não foi possível carregar os fornecedores.", error);

  return actionSuccess(
    data.map((supplier) => ({
      id: supplier.id as SupplierId,
      name: supplier.name,
    })),
  );
}

export async function listSuppliers(
  organizationId: OrganizationId,
): Promise<ActionResult<Supplier[]>> {
  const supabase = await createClient();
  const [suppliersResult, summariesResult] = await Promise.all([
    supabase
      .from("suppliers")
      .select(
        "id, name, phone, contact_name, supplied_items, purchase_url, notes",
      )
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("supplier_purchase_summaries")
      .select("supplier_id, total_spent, entry_count, last_entry_at")
      .eq("organization_id", organizationId),
  ]);

  if (suppliersResult.error || summariesResult.error) {
    return actionFailure("Não foi possível carregar os fornecedores.");
  }

  const summariesBySupplierId = new Map(
    summariesResult.data.map((summary) => [summary.supplier_id, summary]),
  );

  return actionSuccess(
    suppliersResult.data.map((supplier) => {
      const summary = summariesBySupplierId.get(supplier.id);
      return {
        id: supplier.id as SupplierId,
        name: supplier.name,
        phone: supplier.phone,
        contactName: supplier.contact_name,
        suppliedItems: supplier.supplied_items,
        purchaseUrl: supplier.purchase_url,
        notes: supplier.notes,
        totalSpent: summary?.total_spent ?? 0,
        entryCount: summary?.entry_count ?? 0,
        lastEntryAt: summary?.last_entry_at ?? null,
      };
    }),
  );
}

export async function listSupplierPurchases(
  supplierId: SupplierId,
): Promise<ActionResult<SupplierPurchase[]>> {
  const supabase = await createClient();
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("organization_id")
    .eq("id", supplierId)
    .maybeSingle();
  if (
    !(await hasModuleAccessToRecord(supplier?.organization_id, "suppliers"))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { data, error } = await supabase
    .from("stock_entries")
    .select(
      "id, quantity, total_cost, entered_at, ingredient:ingredients(name, unit)",
    )
    .eq("supplier_id", supplierId)
    .order("entered_at", { ascending: false })
    .limit(SUPPLIER_PURCHASES_LIMIT);

  if (error)
    return databaseFailure("Não foi possível carregar as compras.", error);

  return actionSuccess(
    data.flatMap((entry) =>
      entry.ingredient
        ? [
            {
              id: entry.id,
              ingredientName: entry.ingredient.name,
              quantity: entry.quantity,
              unit: entry.ingredient.unit,
              totalCost: entry.total_cost,
              enteredAt: entry.entered_at,
            },
          ]
        : [],
    ),
  );
}

export async function saveSupplier(
  organizationId: OrganizationId,
  supplierId: SupplierId | null,
  input: SupplierInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "suppliers"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = supplierSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const { name, contactName, phone, suppliedItems, purchaseUrl, notes } =
    parsedInput.data;
  const values = {
    name,
    contact_name: contactName || null,
    phone: phone || null,
    supplied_items: suppliedItems || null,
    purchase_url: purchaseUrl || null,
    notes: notes || null,
  };
  const supabase = await createClient();
  const { error } = supplierId
    ? await supabase
        .from("suppliers")
        .update(values)
        .eq("id", supplierId)
        .eq("organization_id", organizationId)
    : await supabase
        .from("suppliers")
        .insert({ ...values, organization_id: organizationId });

  if (error) {
    return actionFailure(
      error.code === UNIQUE_VIOLATION_CODE
        ? "Já existe um fornecedor com esse nome."
        : "Não foi possível salvar o fornecedor.",
    );
  }
  return actionSuccess();
}

export async function deleteSupplier(
  organizationId: OrganizationId,
  supplierId: SupplierId,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "suppliers"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", supplierId)
    .eq("organization_id", organizationId);

  if (error)
    return databaseFailure("Não foi possível excluir o fornecedor.", error);
  return actionSuccess();
}
