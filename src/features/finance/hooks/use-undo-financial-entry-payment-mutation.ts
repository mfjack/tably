import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { undoFinancialEntryPayment } from "../actions";
import type { FinancialEntryId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getUndoFinancialEntryPaymentMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "entries",
    "undo-payment",
  ] as const;
}

export function useUndoFinancialEntryPaymentMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getUndoFinancialEntryPaymentMutationKey(organizationId),
    mutationFn: async (entryId: FinancialEntryId) =>
      unwrapActionResult(
        await undoFinancialEntryPayment(organizationId, entryId),
      ),
    onSuccess: invalidateFinance,
  });
}
