"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import type { IngredientId } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  hasModuleAccess,
  hasModuleAccessToRow,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/team/module-access";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { joinPreparationSteps } from "./preparation-steps";
import {
  type PreparationFormInput,
  type PreparedRecipeFormInput,
  type ProductionResult,
  preparationFormSchema,
} from "./schemas";

const DUPLICATE_NAME_ERROR_CODE = "TB047";

const SINGLE_BATCH = 1;

export async function createPreparation(
  organizationId: OrganizationId,
  input: PreparationFormInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "ingredients"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = preparationFormSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira o preparo e tente novamente.");
  }

  const { name, unit, minimumStock, yieldQuantity, recipe, steps } =
    parsedInput.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_preparation", {
    p_organization_id: organizationId,
    p_name: name,
    p_unit: unit,
    p_minimum_stock: minimumStock ?? 0,
    p_yield_quantity: yieldQuantity,
    p_components: toComponentsPayload(recipe),
    p_instructions: toInstructions(steps),
  });

  if (error?.code === DUPLICATE_NAME_ERROR_CODE) {
    return actionFailure(`Já existe um insumo chamado "${error.message}".`);
  }
  return toRecipeResult(error, "Não foi possível cadastrar o preparo.");
}

export async function updatePreparation(
  preparationId: IngredientId,
  input: PreparationFormInput,
): Promise<ActionResult> {
  if (
    !(await hasModuleAccessToRow("ingredients", preparationId, "ingredients"))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = preparationFormSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira o preparo e tente novamente.");
  }

  const { name, minimumStock, yieldQuantity, recipe, steps } = parsedInput.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_preparation", {
    p_ingredient_id: preparationId,
    p_name: name,
    p_minimum_stock: minimumStock ?? 0,
    p_yield_quantity: yieldQuantity,
    p_components: toComponentsPayload(recipe),
    p_instructions: toInstructions(steps),
  });

  if (error?.code === DUPLICATE_NAME_ERROR_CODE) {
    return actionFailure(`Já existe um insumo chamado "${error.message}".`);
  }
  return toRecipeResult(error, "Não foi possível salvar o preparo.");
}

function toComponentsPayload(recipe: PreparedRecipeFormInput["recipe"]) {
  return recipe.map((recipeItem) => ({
    ingredient_id: recipeItem.ingredientId,
    quantity: recipeItem.quantity,
  }));
}

function toInstructions(steps: PreparedRecipeFormInput["steps"]) {
  return joinPreparationSteps(steps.map((step) => step.text)) || undefined;
}

function toRecipeResult(
  error: PostgrestError | null,
  fallbackMessage: string,
): ActionResult {
  if (error?.code === "TB035") {
    return actionFailure(
      "Essa receita usa um insumo que, por sua vez, leva este. Tire esse insumo da receita.",
    );
  }
  if (error?.code === "42501") {
    return actionFailure("Só o dono ou o gerente pode mudar a receita.");
  }
  if (error) return databaseFailure(fallbackMessage, error);
  return actionSuccess();
}

export async function registerProduction(
  ingredientId: IngredientId,
): Promise<ActionResult<ProductionResult>> {
  if (
    !(await hasModuleAccessToRow("ingredients", ingredientId, "ingredients"))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("register_production", {
      p_ingredient_id: ingredientId,
      p_batches: SINGLE_BATCH,
    })
    .single();

  if (error?.code === "TB036") {
    return actionFailure("Esse insumo não tem receita de produção.");
  }
  if (error) {
    return databaseFailure("Não foi possível registrar a produção.", error);
  }

  return actionSuccess({
    producedQuantity: data.produced_quantity,
    totalCost: data.total_cost,
  });
}
