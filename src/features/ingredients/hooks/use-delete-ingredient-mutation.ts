import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteIngredient } from "../actions";
import type { IngredientId } from "../types";

export function getDeleteIngredientMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "ingredients", "delete"] as const;
}

export function useDeleteIngredientMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getDeleteIngredientMutationKey(organizationId),
    mutationFn: async (ingredientId: IngredientId) =>
      unwrapActionResult(await deleteIngredient(ingredientId)),
    onSuccess: invalidateCatalog,
  });
}
