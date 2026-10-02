import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveFinancialCategory } from "../category-actions";
import type { CategoryInput } from "../schemas";
import type { FinancialCategoryId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getSaveFinancialCategoryMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "categories",
    "save",
  ] as const;
}

export function useSaveFinancialCategoryMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getSaveFinancialCategoryMutationKey(organizationId),
    mutationFn: async ({
      categoryId,
      input,
    }: {
      categoryId: FinancialCategoryId | null;
      input: CategoryInput;
    }) =>
      unwrapActionResult(
        await saveFinancialCategory(organizationId, categoryId, input),
      ),
    onSuccess: invalidateFinance,
  });
}
