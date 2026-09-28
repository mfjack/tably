import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { createStockEntry } from "../actions";
import type { StockEntryFormInput } from "../schemas";
import type { IngredientId } from "../types";

export type CreateStockEntryVariables = {
  ingredientId: IngredientId;
  values: StockEntryFormInput;
};

export function getCreateStockEntryMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "stock-entries", "create"] as const;
}

export function useCreateStockEntryMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getCreateStockEntryMutationKey(organizationId),
    mutationFn: async ({ ingredientId, values }: CreateStockEntryVariables) =>
      unwrapActionResult(
        await createStockEntry(organizationId, ingredientId, values),
      ),
    onSuccess: invalidateCatalog,
  });
}
