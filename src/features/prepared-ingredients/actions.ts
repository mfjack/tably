"use server";

import type { IngredientId } from "@/features/ingredients/types";
import {
  hasModuleAccessToRecord,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { joinPreparationSteps } from "./preparation-steps";
import {
  type PreparedRecipeFormInput,
  type ProductionResult,
  preparedRecipeFormSchema,
} from "./schemas";

const SINGLE_BATCH = 1;

async function canUseIngredient(ingredientId: IngredientId) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ingredients")
    .select("organization_id")
    .eq("id", ingredientId)
    .maybeSingle();
  return hasModuleAccessToRecord(data?.organization_id, "ingredients");
}

export async function savePreparedRecipe(
  ingredientId: IngredientId,
  input: PreparedRecipeFormInput,
): Promise<ActionResult> {
  if (!(await canUseIngredient(ingredientId))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = preparedRecipeFormSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira a receita e tente novamente.");
  }

  const { isPrepared, yieldQuantity, recipe, steps } = parsedInput.data;
  const instructions = joinPreparationSteps(steps.map((step) => step.text));
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_prepared_recipe", {
    p_ingredient_id: ingredientId,
    p_is_prepared: isPrepared,
    p_yield_quantity: yieldQuantity ?? 0,
    p_components: recipe.map((recipeItem) => ({
      ingredient_id: recipeItem.ingredientId,
      quantity: recipeItem.quantity,
    })),
    p_instructions: instructions || undefined,
  });

  if (error?.code === "TB035") {
    return actionFailure(
      "Essa receita usa um insumo que, por sua vez, leva este. Tire esse insumo da receita.",
    );
  }
  if (error?.code === "42501") {
    return actionFailure("Só o dono ou o gerente pode mudar a receita.");
  }
  if (error)
    return databaseFailure("Não foi possível salvar a receita.", error);

  return actionSuccess();
}

export async function registerProduction(
  ingredientId: IngredientId,
): Promise<ActionResult<ProductionResult>> {
  if (!(await canUseIngredient(ingredientId))) {
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
