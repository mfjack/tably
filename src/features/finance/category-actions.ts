"use server";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { isUniqueViolation } from "@/lib/database-errors";
import { createClient } from "@/lib/supabase/server";
import {
  ACCESS_DENIED,
  canUseFinance,
  ensureFinanceDefaults,
} from "./finance-core";
import { type CategoryInput, categorySchema } from "./schemas";
import type { FinancialCategory, FinancialCategoryId } from "./types";

export async function listFinancialCategories(
  organizationId: OrganizationId,
): Promise<ActionResult<FinancialCategory[]>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  await ensureFinanceDefaults(organizationId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_categories")
    .select("id, name, kind, is_archived")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) return actionFailure("Não foi possível carregar as categorias.");

  return actionSuccess(
    data.map((category) => ({
      id: category.id as FinancialCategoryId,
      name: category.name,
      kind: category.kind,
      isArchived: category.is_archived,
    })),
  );
}

export async function saveFinancialCategory(
  organizationId: OrganizationId,
  categoryId: FinancialCategoryId | null,
  input: CategoryInput,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const parsedInput = categorySchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const supabase = await createClient();
  const { error } = categoryId
    ? await supabase
        .from("financial_categories")
        .update({ name: parsedInput.data.name })
        .eq("id", categoryId)
        .eq("organization_id", organizationId)
    : await supabase.from("financial_categories").insert({
        organization_id: organizationId,
        name: parsedInput.data.name,
        kind: parsedInput.data.kind,
      });

  if (error) {
    return actionFailure(
      isUniqueViolation(error)
        ? "Já existe uma categoria com esse nome."
        : "Não foi possível salvar a categoria.",
    );
  }
  return actionSuccess();
}

export async function deleteFinancialCategory(
  organizationId: OrganizationId,
  categoryId: FinancialCategoryId,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_categories")
    .delete()
    .eq("id", categoryId)
    .eq("organization_id", organizationId);

  if (error) return actionFailure("Não foi possível excluir a categoria.");
  return actionSuccess();
}
