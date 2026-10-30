"use server";

import type { FinancialEntryId } from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import type { SupplierId } from "@/features/suppliers/types";
import {
  hasModuleAccess,
  hasModuleAccessToRecord,
  hasModuleAccessToRow,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/team/module-access";
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
  type IngredientsCreateFormInput,
  ingredientFormSchema,
  ingredientsCreateFormSchema,
} from "./schemas";
import type { Ingredient, IngredientId, IngredientLastPurchase } from "./types";

const DUPLICATE_INGREDIENT_ERROR_CODE = "TB047";
const DUPLICATE_NAME_MESSAGE = "Já existe um insumo com esse nome.";
const INVALID_FORM_MESSAGE = "Confira os campos e tente novamente.";
const GENERIC_ERROR_MESSAGE = "Não foi possível salvar. Tente novamente.";

type StockEntryRow = {
  quantity: number;
  total_cost: number;
  entered_at: string;
  supplier: { name: string } | null;
};

function toLastPurchase(
  stockEntry: StockEntryRow | undefined,
): IngredientLastPurchase | null {
  if (!stockEntry || stockEntry.quantity <= 0) return null;
  return {
    unitCost: stockEntry.total_cost / stockEntry.quantity,
    purchasedAt: stockEntry.entered_at,
    supplierName: stockEntry.supplier?.name ?? null,
  };
}

export async function listIngredients(
  organizationId: OrganizationId,
): Promise<ActionResult<Ingredient[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select(
      "id, name, unit, current_stock, minimum_stock, unit_cost, supplier_id, expires_at, label_shelf_life_hours, label_storage, is_prepared, yield_quantity, preparation_instructions, product_ingredients(count), ingredient_components!ingredient_components_prepared_ingredient_id_organization__fkey(component_ingredient_id, quantity), used_as_component:ingredient_components!ingredient_components_component_ingredient_id_organization_fkey(count), product_addons(count), last_purchase:stock_entries(quantity, total_cost, entered_at, supplier:suppliers(name))",
    )
    .eq("organization_id", organizationId)
    .order("name")
    .order("entered_at", {
      referencedTable: "last_purchase",
      ascending: false,
    })
    .limit(1, { referencedTable: "last_purchase" });

  if (error)
    return databaseFailure("Não foi possível carregar os insumos.", error);

  return actionSuccess(
    data.map((ingredient) => {
      const isReferenced =
        (ingredient.product_ingredients[0]?.count ?? 0) > 0 ||
        (ingredient.used_as_component[0]?.count ?? 0) > 0 ||
        (ingredient.product_addons[0]?.count ?? 0) > 0;
      return {
        id: ingredient.id as IngredientId,
        name: ingredient.name,
        unit: ingredient.unit,
        currentStock: ingredient.current_stock,
        minimumStock: ingredient.minimum_stock,
        unitCost: ingredient.unit_cost,
        supplierId: ingredient.supplier_id as SupplierId | null,
        expiresAt: ingredient.expires_at,
        recipeCount: ingredient.product_ingredients[0]?.count ?? 0,
        isReferenced,
        isInUse: ingredient.is_prepared || isReferenced,
        labelShelfLifeHours: ingredient.label_shelf_life_hours,
        labelStorage: ingredient.label_storage,
        isPrepared: ingredient.is_prepared,
        yieldQuantity: ingredient.yield_quantity,
        preparationInstructions: ingredient.preparation_instructions,
        components: ingredient.ingredient_components.map((component) => ({
          ingredientId: component.component_ingredient_id as IngredientId,
          quantity: component.quantity,
        })),
        lastPurchase: toLastPurchase(ingredient.last_purchase[0]),
      };
    }),
  );
}

export async function createIngredients(
  organizationId: OrganizationId,
  input: IngredientsCreateFormInput,
): Promise<ActionResult<FinancialEntryId | null>> {
  if (!(await hasModuleAccess(organizationId, "ingredients"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = ingredientsCreateFormSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const { supplierId, paymentDueDate, ingredients } = parsedInput.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_ingredients", {
    p_organization_id: organizationId,
    p_ingredients: ingredients.map((ingredient) => ({
      ingredient_id: ingredient.ingredientId || null,
      name: ingredient.name,
      unit: ingredient.unit,
      quantity: ingredient.quantity,
      total_cost: ingredient.totalCost ?? 0,
      minimum_stock: ingredient.minimumStock ?? 0,
      expires_at: ingredient.expiresAt || null,
    })),
    p_payment_date: paymentDueDate || undefined,
    p_supplier_id: fromSelectFieldValue<SupplierId>(supplierId),
  });

  if (error?.code === "P0002") {
    return actionFailure(
      "Algum insumo ou fornecedor não existe mais. Atualize a página.",
    );
  }
  if (error?.code === DUPLICATE_INGREDIENT_ERROR_CODE) {
    return actionFailure(`Já existe um insumo chamado "${error.message}".`);
  }
  if (isUniqueViolation(error)) return actionFailure(DUPLICATE_NAME_MESSAGE);
  if (error) return databaseFailure(GENERIC_ERROR_MESSAGE, error);

  return actionSuccess((data as FinancialEntryId | null) ?? null);
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
    unit,
    minimumStock,
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
      minimum_stock: minimumStock ?? 0,
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
  if (
    !(await hasModuleAccessToRow("ingredients", ingredientId, "ingredients"))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { data: ingredient } = await supabase
    .from("ingredients")
    .select("is_prepared")
    .eq("id", ingredientId)
    .maybeSingle();
  const { error } = ingredient?.is_prepared
    ? await supabase.rpc("delete_preparation", {
        p_ingredient_id: ingredientId,
      })
    : await supabase.from("ingredients").delete().eq("id", ingredientId);

  if (isForeignKeyViolation(error)) {
    return actionFailure(
      "Esse insumo está na ficha técnica de algum produto. Remova-o dos produtos antes de excluir.",
    );
  }
  if (error)
    return databaseFailure("Não foi possível excluir o insumo.", error);

  return actionSuccess();
}
