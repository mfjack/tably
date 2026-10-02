import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteFinancialCategory } from "../category-actions";
import type { FinancialCategoryId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getDeleteFinancialCategoryMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "categories",
    "delete",
  ] as const;
}

export function useDeleteFinancialCategoryMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getDeleteFinancialCategoryMutationKey(organizationId),
    mutationFn: async (categoryId: FinancialCategoryId) =>
      unwrapActionResult(
        await deleteFinancialCategory(organizationId, categoryId),
      ),
    onSuccess: invalidateFinance,
  });
}
