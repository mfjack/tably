import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { IngredientId } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { savePreparedRecipe } from "../actions";
import type { PreparedRecipeFormInput } from "../schemas";

export type SavePreparedRecipeVariables = {
  ingredientId: IngredientId;
  values: PreparedRecipeFormInput;
};

export function getSavePreparedRecipeMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "prepared-recipes", "save"] as const;
}

export function useSavePreparedRecipeMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getSavePreparedRecipeMutationKey(organizationId),
    mutationFn: async ({ ingredientId, values }: SavePreparedRecipeVariables) =>
      unwrapActionResult(await savePreparedRecipe(ingredientId, values)),
    onSuccess: invalidateCatalog,
  });
}
