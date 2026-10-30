import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { IngredientId } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { createPreparation, updatePreparation } from "../actions";
import type { PreparationFormInput } from "../schemas";

export type SavePreparationVariables = {
  preparationId?: IngredientId;
  values: PreparationFormInput;
};

export function getSavePreparationMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "preparations", "save"] as const;
}

export function useSavePreparationMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getSavePreparationMutationKey(organizationId),
    mutationFn: async ({ preparationId, values }: SavePreparationVariables) =>
      unwrapActionResult(
        preparationId
          ? await updatePreparation(preparationId, values)
          : await createPreparation(organizationId, values),
      ),
    onSuccess: invalidateCatalog,
  });
}
