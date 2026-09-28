import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteCategory } from "../actions";
import type { CategoryId } from "../types";

export function getDeleteCategoryMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "categories", "delete"] as const;
}

export function useDeleteCategoryMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getDeleteCategoryMutationKey(organizationId),
    mutationFn: async (categoryId: CategoryId) =>
      unwrapActionResult(await deleteCategory(categoryId)),
    onSuccess: invalidateCatalog,
  });
}
