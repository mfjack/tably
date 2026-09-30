import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { createFinancialTransfer } from "../actions";
import type { TransferInput } from "../schemas";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getCreateFinancialTransferMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "transfers",
    "create",
  ] as const;
}

export function useCreateFinancialTransferMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getCreateFinancialTransferMutationKey(organizationId),
    mutationFn: async (input: TransferInput) =>
      unwrapActionResult(await createFinancialTransfer(organizationId, input)),
    onSuccess: invalidateFinance,
  });
}
