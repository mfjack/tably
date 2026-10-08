"use server";

import type { IngredientId } from "@/features/ingredients/types";
import {
  hasModuleAccess,
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
import { type LabelDefaultsInput, labelDefaultsSchema } from "./schemas";

export async function saveLabelDefaults(
  organizationId: OrganizationId,
  ingredientId: IngredientId,
  input: LabelDefaultsInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "ingredients"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = labelDefaultsSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira a validade e a conservação.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_ingredient_label_defaults", {
    p_ingredient_id: ingredientId,
    p_shelf_life_hours: parsedInput.data.shelfLifeHours,
    p_storage: parsedInput.data.storage,
  });

  if (error)
    return databaseFailure("Não foi possível guardar o padrão.", error);

  return actionSuccess();
}
