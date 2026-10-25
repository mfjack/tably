import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { addProductStock } from "../actions";
import type { ProductId } from "../types";

type AddProductStockVariables = {
  productId: ProductId;
  quantity: number;
};

export function getAddProductStockMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "products", "add-stock"] as const;
}

export function useAddProductStockMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getAddProductStockMutationKey(organizationId),
    mutationFn: async ({ productId, quantity }: AddProductStockVariables) =>
      unwrapActionResult(
        await addProductStock(organizationId, productId, quantity),
      ),
    onSuccess: invalidateCatalog,
  });
}
