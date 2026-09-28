import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteCategory } from "../actions";
import type { CategoryId } from "../types";
import { getCategoriesQueryKey } from "./use-categories-query";

export function getDeleteCategoryMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "categories", "delete"] as const;
}

export function useDeleteCategoryMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getDeleteCategoryMutationKey(organizationId),
    mutationFn: async (categoryId: CategoryId) =>
      unwrapActionResult(await deleteCategory(categoryId)),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getCategoriesQueryKey(organizationId),
      }),
  });
}
