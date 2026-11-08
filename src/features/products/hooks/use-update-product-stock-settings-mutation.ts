import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import { useInvalidateFinance } from "@/features/finance/hooks/use-invalidate-finance";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { updateProductStockSettings } from "../actions";
import type { ProductStockSettingsInput } from "../schemas";
import type { ProductId } from "../types";

type UpdateProductStockSettingsVariables = {
  productId: ProductId;
  values: ProductStockSettingsInput;
};

export function getUpdateProductStockSettingsMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "products",
    "stock-settings",
  ] as const;
}

export function useUpdateProductStockSettingsMutation(
  organizationId: OrganizationId,
) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getUpdateProductStockSettingsMutationKey(organizationId),
    mutationFn: async ({
      productId,
      values,
    }: UpdateProductStockSettingsVariables) =>
      unwrapActionResult(await updateProductStockSettings(productId, values)),
    onSuccess: () => Promise.all([invalidateCatalog(), invalidateFinance()]),
  });
}
