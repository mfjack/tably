import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateSuppliers } from "@/features/suppliers/hooks/use-invalidate-suppliers";
import { unwrapActionResult } from "@/lib/action-result";
import { updateIngredient } from "../actions";
import type { IngredientFormInput } from "../schemas";
import type { IngredientId } from "../types";

export type UpdateIngredientVariables = {
  ingredientId: IngredientId;
  values: IngredientFormInput;
};

export function getUpdateIngredientMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "ingredients", "update"] as const;
}

export function useUpdateIngredientMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);
  const invalidateSuppliers = useInvalidateSuppliers(organizationId);

  return useMutation({
    mutationKey: getUpdateIngredientMutationKey(organizationId),
    mutationFn: async ({ ingredientId, values }: UpdateIngredientVariables) =>
      unwrapActionResult(await updateIngredient(ingredientId, values)),
    onSuccess: () => Promise.all([invalidateCatalog(), invalidateSuppliers()]),
  });
}
