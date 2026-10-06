import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteProductAddon } from "../actions";
import type { ProductAddonId } from "../types";

export function getDeleteProductAddonMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "product-addons", "delete"] as const;
}

export function useDeleteProductAddonMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getDeleteProductAddonMutationKey(organizationId),
    mutationFn: async (addonId: ProductAddonId) =>
      unwrapActionResult(await deleteProductAddon(addonId)),
    onSuccess: invalidateCatalog,
  });
}
