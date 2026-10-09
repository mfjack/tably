import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { IngredientId } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { registerProduction } from "../actions";
import type { ProductionFormInput } from "../schemas";

export type RegisterProductionVariables = {
  ingredientId: IngredientId;
  values: ProductionFormInput;
};

export function getRegisterProductionMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "production", "register"] as const;
}

export function useRegisterProductionMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getRegisterProductionMutationKey(organizationId),
    mutationFn: async ({ ingredientId, values }: RegisterProductionVariables) =>
      unwrapActionResult(await registerProduction(ingredientId, values)),
    onSuccess: invalidateCatalog,
  });
}
