"use server";

import type { IngredientId } from "@/features/ingredients/types";
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
} from "@/lib/action-result";
import { isUniqueViolation } from "@/lib/database-errors";
import { fromSelectFieldValue } from "@/lib/optional-select-value";
import { createClient } from "@/lib/supabase/server";
import { type ProductAddonFormInput, productAddonFormSchema } from "./schemas";
import type { ProductAddon, ProductAddonId } from "./types";

const DUPLICATE_NAME_MESSAGE = "Já existe um adicional com esse nome.";
const INVALID_FORM_MESSAGE = "Confira os campos e tente novamente.";

export async function listProductAddons(
  organizationId: OrganizationId,
): Promise<ActionResult<ProductAddon[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_addons")
    .select("id, name, price, is_active, ingredient_id, ingredient_quantity")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) return actionFailure("Não foi possível carregar os adicionais.");

  return actionSuccess(
    data.map((addon) => ({
      id: addon.id as ProductAddonId,
      name: addon.name,
      price: addon.price,
      isActive: addon.is_active,
      ingredientId: addon.ingredient_id as IngredientId | null,
      ingredientQuantity: addon.ingredient_quantity,
    })),
  );
}

export async function saveProductAddon(
  organizationId: OrganizationId,
  addonId: ProductAddonId | undefined,
  input: ProductAddonFormInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "products"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = productAddonFormSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const { name, price, isActive, ingredientId, ingredientQuantity } =
    parsedInput.data;
  const selectedIngredientId =
    fromSelectFieldValue<IngredientId>(ingredientId) ?? null;
  const values = {
    name,
    price,
    is_active: isActive,
    ingredient_id: selectedIngredientId,
    ingredient_quantity: selectedIngredientId
      ? (ingredientQuantity ?? null)
      : null,
  };

  const supabase = await createClient();
  const { error } = addonId
    ? await supabase
        .from("product_addons")
        .update(values)
        .eq("id", addonId)
        .eq("organization_id", organizationId)
    : await supabase
        .from("product_addons")
        .insert({ ...values, organization_id: organizationId });

  if (isUniqueViolation(error)) return actionFailure(DUPLICATE_NAME_MESSAGE);
  if (error) return actionFailure("Não foi possível salvar o adicional.");

  return actionSuccess();
}

export async function deleteProductAddon(
  addonId: ProductAddonId,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: addon } = await supabase
    .from("product_addons")
    .select("organization_id")
    .eq("id", addonId)
    .maybeSingle();
  if (!(await hasModuleAccessToRecord(addon?.organization_id, "products"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { error } = await supabase
    .from("product_addons")
    .delete()
    .eq("id", addonId);

  if (error) return actionFailure("Não foi possível excluir o adicional.");

  return actionSuccess();
}
