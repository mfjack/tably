import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { createCategory, updateCategory } from "../actions";
import type { CategoryFormInput } from "../schemas";
import type { CategoryId } from "../types";
import { getCategoriesQueryKey } from "./use-categories-query";

export type SaveCategoryVariables = {
  categoryId?: CategoryId;
  values: CategoryFormInput;
};

export function getSaveCategoryMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "categories", "save"] as const;
}

export function useSaveCategoryMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getSaveCategoryMutationKey(organizationId),
    mutationFn: async ({ categoryId, values }: SaveCategoryVariables) =>
      unwrapActionResult(
        categoryId
          ? await updateCategory(categoryId, values)
          : await createCategory(organizationId, values),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getCategoriesQueryKey(organizationId),
      }),
  });
}
