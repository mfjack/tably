import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { createIngredient, updateIngredient } from "../actions";
import type { IngredientFormInput } from "../schemas";
import type { IngredientId } from "../types";
import { getIngredientsQueryKey } from "./use-ingredients-query";

export type SaveIngredientVariables = {
  ingredientId?: IngredientId;
  values: IngredientFormInput;
};

export function getSaveIngredientMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "ingredients", "save"] as const;
}

export function useSaveIngredientMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getSaveIngredientMutationKey(organizationId),
    mutationFn: async ({ ingredientId, values }: SaveIngredientVariables) =>
      unwrapActionResult(
        ingredientId
          ? await updateIngredient(ingredientId, values)
          : await createIngredient(organizationId, values),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getIngredientsQueryKey(organizationId),
      }),
  });
}
