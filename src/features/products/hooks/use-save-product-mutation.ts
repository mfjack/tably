import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveProduct } from "../actions";
import type { ProductFormInput } from "../schemas";
import type { ProductId } from "../types";

export type SaveProductVariables = {
  productId?: ProductId;
  values: ProductFormInput;
};

export function getSaveProductMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "products", "save"] as const;
}

export function useSaveProductMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getSaveProductMutationKey(organizationId),
    mutationFn: async ({ productId, values }: SaveProductVariables) =>
      unwrapActionResult(await saveProduct(organizationId, productId, values)),
    onSuccess: invalidateCatalog,
  });
}
