"use server";

import {
  hasModuleAccess,
  hasModuleAccessToRecord,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import type { SupplierId } from "@/features/suppliers/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "@/lib/database-errors";
import { fromSelectFieldValue } from "@/lib/optional-select-value";
import { createClient } from "@/lib/supabase/server";
import { canChangeMeasureUnit } from "./measure-units";
import {
  type IngredientFormInput,
  ingredientFormSchema,
  type StockEntryFormInput,
  stockEntryFormSchema,
} from "./schemas";
import type { Ingredient, IngredientId } from "./types";

const DUPLICATE_NAME_MESSAGE = "Já existe um insumo com esse nome.";
const INVALID_FORM_MESSAGE = "Confira os campos e tente novamente.";
const GENERIC_ERROR_MESSAGE = "Não foi possível salvar. Tente novamente.";

export async function listIngredients(
  organizationId: OrganizationId,
): Promise<ActionResult<Ingredient[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select(
      "id, name, brand, unit, current_stock, minimum_stock, unit_cost, supplier_id, expires_at, label_shelf_life_hours, label_storage, is_prepared, yield_quantity, product_ingredients(count), ingredient_components!ingredient_components_prepared_ingredient_id_organization__fkey(component_ingredient_id, quantity)",
    )
    .eq("organization_id", organizationId)
    .order("name");

  if (error)
    return databaseFailure("Não foi possível carregar os insumos.", error);

  return actionSuccess(
    data.map((ingredient) => ({
      id: ingredient.id as IngredientId,
      name: ingredient.name,
      brand: ingredient.brand,
      unit: ingredient.unit,
      currentStock: ingredient.current_stock,
      minimumStock: ingredient.minimum_stock,
      unitCost: ingredient.unit_cost,
      supplierId: ingredient.supplier_id as SupplierId | null,
      expiresAt: ingredient.expires_at,
      recipeCount: ingredient.product_ingredients[0]?.count ?? 0,
      labelShelfLifeHours: ingredient.label_shelf_life_hours,
      labelStorage: ingredient.label_storage,
      isPrepared: ingredient.is_prepared,
      yieldQuantity: ingredient.yield_quantity,
      components: ingredient.ingredient_components.map((component) => ({
        ingredientId: component.component_ingredient_id as IngredientId,
        quantity: component.quantity,
      })),
    })),
  );
}

export async function createIngredient(
  organizationId: OrganizationId,
  input: IngredientFormInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "ingredients"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = ingredientFormSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const {
    name,
    brand,
    unit,
    quantity,
    totalCost,
    minimumStock,
    supplierId,
    expiresAt,
    paymentDueDate,
  } = parsedInput.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_ingredient", {
    p_organization_id: organizationId,
    p_name: name,
    p_unit: unit,
    p_quantity: quantity ?? 0,
    p_total_cost: totalCost ?? 0,
    p_minimum_stock: minimumStock ?? 0,
    p_brand: brand || undefined,
    p_supplier_id: fromSelectFieldValue<SupplierId>(supplierId),
    p_expires_at: expiresAt || undefined,
    p_payment_due_date:
      (totalCost ?? 0) > 0 ? paymentDueDate || undefined : undefined,
  });

  if (isUniqueViolation(error)) return actionFailure(DUPLICATE_NAME_MESSAGE);
  if (error) return databaseFailure(GENERIC_ERROR_MESSAGE, error);

  return actionSuccess();
}

export async function updateIngredient(
  ingredientId: IngredientId,
  input: IngredientFormInput,
): Promise<ActionResult> {
  const parsedInput = ingredientFormSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const {
    name,
    brand,
    unit,
    minimumStock,
    currentStock,
    supplierId,
    expiresAt,
  } = parsedInput.data;
  const supabase = await createClient();
  const { data: ingredient } = await supabase
    .from("ingredients")
    .select("organization_id, unit")
    .eq("id", ingredientId)
    .maybeSingle();
  if (
    !ingredient ||
    !(await hasModuleAccessToRecord(ingredient.organization_id, "ingredients"))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  if (!canChangeMeasureUnit(ingredient.unit, unit)) {
    return actionFailure("Essa unidade de medida não pode ser trocada.");
  }
  const { error } = await supabase
    .from("ingredients")
    .update({
      name,
      unit,
      brand: brand || null,
      minimum_stock: minimumStock ?? 0,
      supplier_id: fromSelectFieldValue<SupplierId>(supplierId) ?? null,
      expires_at: expiresAt || null,
    })
    .eq("id", ingredientId);

  if (isUniqueViolation(error)) return actionFailure(DUPLICATE_NAME_MESSAGE);
  if (error) return databaseFailure(GENERIC_ERROR_MESSAGE, error);

  if (currentStock !== undefined) {
    const { error: adjustError } = await supabase.rpc(
      "adjust_ingredient_stock",
      { p_ingredient_id: ingredientId, p_quantity: currentStock },
    );
    if (adjustError) {
      return databaseFailure(
        "Não foi possível corrigir o estoque.",
        adjustError,
      );
    }
  }

  return actionSuccess();
}

export async function deleteIngredient(
  ingredientId: IngredientId,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: ingredient } = await supabase
    .from("ingredients")
    .select("organization_id")
    .eq("id", ingredientId)
    .maybeSingle();
  if (
    !(await hasModuleAccessToRecord(ingredient?.organization_id, "ingredients"))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { error } = await supabase
    .from("ingredients")
    .delete()
    .eq("id", ingredientId);

  if (isForeignKeyViolation(error)) {
    return actionFailure(
      "Esse insumo está na ficha técnica de algum produto. Remova-o dos produtos antes de excluir.",
    );
  }
  if (error)
    return databaseFailure("Não foi possível excluir o insumo.", error);

  return actionSuccess();
}

export async function createStockEntry(
  organizationId: OrganizationId,
  ingredientId: IngredientId,
  input: StockEntryFormInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "ingredients"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = stockEntryFormSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const { quantity, totalCost, supplierId, expiresAt, paymentDueDate } =
    parsedInput.data;
  const supabase = await createClient();
  const { error } = await supabase.from("stock_entries").insert({
    organization_id: organizationId,
    ingredient_id: ingredientId,
    supplier_id: fromSelectFieldValue<SupplierId>(supplierId) ?? null,
    quantity,
    total_cost: totalCost,
    expires_at: expiresAt || null,
    payment_due_date: totalCost > 0 ? paymentDueDate || null : null,
  });

  if (error)
    return databaseFailure("Não foi possível registrar a entrada.", error);

  return actionSuccess();
}
