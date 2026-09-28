import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteProduct } from "../actions";
import type { ProductId } from "../types";

export function getDeleteProductMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "products", "delete"] as const;
}

export function useDeleteProductMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getDeleteProductMutationKey(organizationId),
    mutationFn: async (productId: ProductId) =>
      unwrapActionResult(await deleteProduct(productId)),
    onSuccess: invalidateCatalog,
  });
}
