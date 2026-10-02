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
} from "@/lib/action-result";
import { isUniqueViolation } from "@/lib/database-errors";
import { createClient } from "@/lib/supabase/server";
import { type CategoryFormInput, categoryFormSchema } from "./schemas";
import type { Category, CategoryId } from "./types";

const DUPLICATE_NAME_MESSAGE = "Já existe uma categoria com esse nome.";
const INVALID_FORM_MESSAGE = "Confira os campos e tente novamente.";
const GENERIC_ERROR_MESSAGE = "Não foi possível salvar. Tente novamente.";

export async function listCategories(
  organizationId: OrganizationId,
): Promise<ActionResult<Category[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, is_on_menu, products(count)")
    .eq("organization_id", organizationId)
    .order("created_at")
    .order("position");

  if (error) return actionFailure("Não foi possível carregar as categorias.");

  return actionSuccess(
    data.map((category) => ({
      id: category.id as CategoryId,
      name: category.name,
      isOnMenu: category.is_on_menu,
      productCount: category.products[0]?.count ?? 0,
    })),
  );
}

export async function createCategory(
  organizationId: OrganizationId,
  input: CategoryFormInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "categories"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = categoryFormSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    organization_id: organizationId,
    name: parsedInput.data.name,
    is_on_menu: parsedInput.data.isOnMenu,
  });

  if (isUniqueViolation(error)) return actionFailure(DUPLICATE_NAME_MESSAGE);
  if (error) return actionFailure(GENERIC_ERROR_MESSAGE);

  return actionSuccess();
}

export async function updateCategory(
  categoryId: CategoryId,
  input: CategoryFormInput,
): Promise<ActionResult> {
  const parsedInput = categoryFormSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("organization_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (
    !(await hasModuleAccessToRecord(category?.organization_id, "categories"))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { error } = await supabase
    .from("categories")
    .update({
      name: parsedInput.data.name,
      is_on_menu: parsedInput.data.isOnMenu,
    })
    .eq("id", categoryId);

  if (isUniqueViolation(error)) return actionFailure(DUPLICATE_NAME_MESSAGE);
  if (error) return actionFailure(GENERIC_ERROR_MESSAGE);

  return actionSuccess();
}

export async function deleteCategory(
  categoryId: CategoryId,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("organization_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (
    !(await hasModuleAccessToRecord(category?.organization_id, "categories"))
  ) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) return actionFailure("Não foi possível excluir a categoria.");

  return actionSuccess();
}
