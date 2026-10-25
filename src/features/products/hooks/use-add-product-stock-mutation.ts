import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import { useInvalidateFinance } from "@/features/finance/hooks/use-invalidate-finance";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { addProductStock } from "../actions";
import type { ProductStockEntryInput } from "../schemas";
import type { ProductId } from "../types";

type AddProductStockVariables = {
  productId: ProductId;
  values: ProductStockEntryInput;
};

export function getAddProductStockMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "products", "add-stock"] as const;
}

export function useAddProductStockMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getAddProductStockMutationKey(organizationId),
    mutationFn: async ({ productId, values }: AddProductStockVariables) =>
      unwrapActionResult(
        await addProductStock(organizationId, productId, values),
      ),
    onSuccess: () => Promise.all([invalidateCatalog(), invalidateFinance()]),
  });
}
