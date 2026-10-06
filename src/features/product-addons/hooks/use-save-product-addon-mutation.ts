import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveProductAddon } from "../actions";
import type { ProductAddonFormInput } from "../schemas";
import type { ProductAddonId } from "../types";

export type SaveProductAddonVariables = {
  addonId?: ProductAddonId;
  values: ProductAddonFormInput;
};

export function getSaveProductAddonMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "product-addons", "save"] as const;
}

export function useSaveProductAddonMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getSaveProductAddonMutationKey(organizationId),
    mutationFn: async ({ addonId, values }: SaveProductAddonVariables) =>
      unwrapActionResult(
        await saveProductAddon(organizationId, addonId, values),
      ),
    onSuccess: invalidateCatalog,
  });
}
