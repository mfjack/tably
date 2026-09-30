import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteFinancialTransfer } from "../actions";
import type { FinancialTransferId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getDeleteFinancialTransferMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "transfers",
    "delete",
  ] as const;
}

export function useDeleteFinancialTransferMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getDeleteFinancialTransferMutationKey(organizationId),
    mutationFn: async (transferId: FinancialTransferId) =>
      unwrapActionResult(
        await deleteFinancialTransfer(organizationId, transferId),
      ),
    onSuccess: invalidateFinance,
  });
}
