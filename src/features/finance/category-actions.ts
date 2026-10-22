"use server";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { isUniqueViolation } from "@/lib/database-errors";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_DRE_GROUP_BY_KIND, isDreGroupOfKind } from "./dre-groups";
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
    .select("id, name, kind, dre_group, is_archived")
    .eq("organization_id", organizationId)
    .order("name");

  if (error)
    return databaseFailure("Não foi possível carregar as categorias.", error);

  return actionSuccess(
    data.map((category) => ({
      id: category.id as FinancialCategoryId,
      name: category.name,
      kind: category.kind,
      dreGroup: category.dre_group,
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

  const { name, kind, dreGroup } = parsedInput.data;
  if (dreGroup && !isDreGroupOfKind(dreGroup, kind)) {
    return actionFailure("Esse grupo da DRE não combina com o tipo.");
  }

  const supabase = await createClient();
  const { error } = categoryId
    ? await supabase
        .from("financial_categories")
        .update({ name, ...(dreGroup && { dre_group: dreGroup }) })
        .eq("id", categoryId)
        .eq("organization_id", organizationId)
    : await supabase.from("financial_categories").insert({
        organization_id: organizationId,
        name,
        kind,
        dre_group: dreGroup ?? DEFAULT_DRE_GROUP_BY_KIND[kind],
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

  if (error)
    return databaseFailure("Não foi possível excluir a categoria.", error);
  return actionSuccess();
}
