import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getIngredientsQueryKey } from "@/features/ingredients/hooks/use-ingredients-query";
import type { IngredientId } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveLabelDefaults } from "../actions";
import type { LabelDefaultsInput } from "../schemas";

export type SaveLabelDefaultsVariables = {
  ingredientId: IngredientId;
  values: LabelDefaultsInput;
};

export function getSaveLabelDefaultsMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "label-defaults", "save"] as const;
}

export function useSaveLabelDefaultsMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getSaveLabelDefaultsMutationKey(organizationId),
    mutationFn: async ({ ingredientId, values }: SaveLabelDefaultsVariables) =>
      unwrapActionResult(
        await saveLabelDefaults(organizationId, ingredientId, values),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getIngredientsQueryKey(organizationId),
      }),
  });
}
