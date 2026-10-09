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
      "id, name, brand, unit, current_stock, minimum_stock, target_stock, unit_cost, supplier_id, expires_at, label_shelf_life_hours, label_storage, is_prepared, yield_quantity, preparation_instructions, product_ingredients(count), ingredient_components!ingredient_components_prepared_ingredient_id_organization__fkey(component_ingredient_id, quantity), used_as_component:ingredient_components!ingredient_components_component_ingredient_id_organization_fkey(count), product_addons(count)",
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
      targetStock: ingredient.target_stock,
      unitCost: ingredient.unit_cost,
      supplierId: ingredient.supplier_id as SupplierId | null,
      expiresAt: ingredient.expires_at,
      recipeCount: ingredient.product_ingredients[0]?.count ?? 0,
      isInUse:
        ingredient.is_prepared ||
        (ingredient.product_ingredients[0]?.count ?? 0) > 0 ||
        (ingredient.used_as_component[0]?.count ?? 0) > 0 ||
        (ingredient.product_addons[0]?.count ?? 0) > 0,
      labelShelfLifeHours: ingredient.label_shelf_life_hours,
      labelStorage: ingredient.label_storage,
      isPrepared: ingredient.is_prepared,
      yieldQuantity: ingredient.yield_quantity,
      preparationInstructions: ingredient.preparation_instructions,
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
    targetStock,
    supplierId,
    expiresAt,
    paymentDueDate,
  } = parsedInput.data;
  const supabase = await createClient();
  const { data: createdIngredientId, error } = await supabase.rpc(
    "create_ingredient",
    {
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
    },
  );

  if (isUniqueViolation(error)) return actionFailure(DUPLICATE_NAME_MESSAGE);
  if (error) return databaseFailure(GENERIC_ERROR_MESSAGE, error);

  if (targetStock !== undefined) {
    const { error: targetError } = await supabase
      .from("ingredients")
      .update({ target_stock: targetStock })
      .eq("id", createdIngredientId);
    if (targetError) {
      return databaseFailure(
        "O insumo foi salvo, mas a quantidade ideal não.",
        targetError,
      );
    }
  }

  return actionSuccess();
}

async function isIngredientInUse(ingredientId: IngredientId) {
  const supabase = await createClient();
  const [recipes, components, addons, ingredient] = await Promise.all([
    supabase
      .from("product_ingredients")
      .select("product_id", { count: "exact", head: true })
      .eq("ingredient_id", ingredientId),
    supabase
      .from("ingredient_components")
      .select("prepared_ingredient_id", { count: "exact", head: true })
      .eq("component_ingredient_id", ingredientId),
    supabase
      .from("product_addons")
      .select("id", { count: "exact", head: true })
      .eq("ingredient_id", ingredientId),
    supabase
      .from("ingredients")
      .select("is_prepared")
      .eq("id", ingredientId)
      .maybeSingle(),
  ]);
  return (
    Boolean(ingredient.data?.is_prepared) ||
    (recipes.count ?? 0) > 0 ||
    (components.count ?? 0) > 0 ||
    (addons.count ?? 0) > 0
  );
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
    targetStock,
    currentStock,
    currentStockCost,
    supplierId,
    expiresAt,
  } = parsedInput.data;
  const supabase = await createClient();
  const { data: ingredient } = await supabase
    .from("ingredients")
    .select("organization_id, unit, is_prepared")
    .eq("id", ingredientId)
    .maybeSingle();
  if (
    !ingredient ||
    !(await hasModuleAccessToRecord(ingredient.organization_id, "ingredients"))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  if (
    !canChangeMeasureUnit(ingredient.unit, unit) &&
    (await isIngredientInUse(ingredientId))
  ) {
    return actionFailure(
      "Esse insumo é usado em fichas técnicas, receitas ou adicionais. Só dá para trocar entre g e ml.",
    );
  }
  const { error } = await supabase
    .from("ingredients")
    .update({
      name,
      unit,
      brand: brand || null,
      minimum_stock: minimumStock ?? 0,
      target_stock: targetStock ?? null,
      supplier_id: fromSelectFieldValue<SupplierId>(supplierId) ?? null,
      expires_at: expiresAt || null,
      ...(currentStockCost !== undefined &&
        (currentStock ?? 0) > 0 &&
        !ingredient.is_prepared && {
          unit_cost: currentStockCost / (currentStock ?? 1),
        }),
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
