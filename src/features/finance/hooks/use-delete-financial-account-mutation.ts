import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteFinancialAccount } from "../actions";
import type { FinancialAccountId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getDeleteFinancialAccountMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "accounts",
    "delete",
  ] as const;
}

export function useDeleteFinancialAccountMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getDeleteFinancialAccountMutationKey(organizationId),
    mutationFn: async (accountId: FinancialAccountId) =>
      unwrapActionResult(
        await deleteFinancialAccount(organizationId, accountId),
      ),
    onSuccess: invalidateFinance,
  });
}
