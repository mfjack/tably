import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteIngredient } from "../actions";
import type { IngredientId } from "../types";
import { getIngredientsQueryKey } from "./use-ingredients-query";

export function getDeleteIngredientMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "ingredients", "delete"] as const;
}

export function useDeleteIngredientMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getDeleteIngredientMutationKey(organizationId),
    mutationFn: async (ingredientId: IngredientId) =>
      unwrapActionResult(await deleteIngredient(ingredientId)),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getIngredientsQueryKey(organizationId),
      }),
  });
}
