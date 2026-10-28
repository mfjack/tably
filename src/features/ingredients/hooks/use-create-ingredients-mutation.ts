import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import { useInvalidateFinance } from "@/features/finance/hooks/use-invalidate-finance";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateSuppliers } from "@/features/suppliers/hooks/use-invalidate-suppliers";
import { unwrapActionResult } from "@/lib/action-result";
import { createIngredients } from "../actions";
import type { IngredientsCreateFormInput } from "../schemas";

export function getCreateIngredientsMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "ingredients", "create"] as const;
}

export function useCreateIngredientsMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);
  const invalidateSuppliers = useInvalidateSuppliers(organizationId);
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getCreateIngredientsMutationKey(organizationId),
    mutationFn: async (values: IngredientsCreateFormInput) =>
      unwrapActionResult(await createIngredients(organizationId, values)),
    onSuccess: () =>
      Promise.all([
        invalidateCatalog(),
        invalidateSuppliers(),
        invalidateFinance(),
      ]),
  });
}
