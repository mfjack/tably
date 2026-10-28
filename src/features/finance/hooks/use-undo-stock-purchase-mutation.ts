import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { undoStockPurchase } from "../actions";
import type { FinancialEntryId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getUndoStockPurchaseMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "stock-purchases",
    "undo",
  ] as const;
}

export function useUndoStockPurchaseMutation(organizationId: OrganizationId) {
  const invalidateFinance = useInvalidateFinance(organizationId);
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getUndoStockPurchaseMutationKey(organizationId),
    mutationFn: async (entryId: FinancialEntryId) =>
      unwrapActionResult(await undoStockPurchase(organizationId, entryId)),
    onSuccess: () => Promise.all([invalidateFinance(), invalidateCatalog()]),
  });
}
