import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import { useInvalidateFinance } from "@/features/finance/hooks/use-invalidate-finance";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateSuppliers } from "@/features/suppliers/hooks/use-invalidate-suppliers";
import { unwrapActionResult } from "@/lib/action-result";
import { createIngredient, updateIngredient } from "../actions";
import type { IngredientFormInput } from "../schemas";
import type { IngredientId } from "../types";

export type SaveIngredientVariables = {
  ingredientId?: IngredientId;
  values: IngredientFormInput;
};

export function getSaveIngredientMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "ingredients", "save"] as const;
}

export function useSaveIngredientMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);
  const invalidateSuppliers = useInvalidateSuppliers(organizationId);
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getSaveIngredientMutationKey(organizationId),
    mutationFn: async ({ ingredientId, values }: SaveIngredientVariables) =>
      unwrapActionResult(
        ingredientId
          ? await updateIngredient(ingredientId, values)
          : await createIngredient(organizationId, values),
      ),
    onSuccess: () =>
      Promise.all([
        invalidateCatalog(),
        invalidateSuppliers(),
        invalidateFinance(),
      ]),
  });
}
