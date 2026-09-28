import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getCategoriesQueryKey } from "@/features/categories/hooks/use-categories-query";
import { getIngredientsQueryKey } from "@/features/ingredients/hooks/use-ingredients-query";
import type { OrganizationId } from "@/features/organizations/types";
import { getProductsQueryKey } from "@/features/products/hooks/use-products-query";

export function useInvalidateCatalog(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      Promise.all(
        [
          getProductsQueryKey(organizationId),
          getCategoriesQueryKey(organizationId),
          getIngredientsQueryKey(organizationId),
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
    [queryClient, organizationId],
  );
}
