import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { setFinancialAccountArchived } from "../actions";
import type { FinancialAccountId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getSetFinancialAccountArchivedMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "accounts",
    "archive",
  ] as const;
}

export function useSetFinancialAccountArchivedMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getSetFinancialAccountArchivedMutationKey(organizationId),
    mutationFn: async ({
      accountId,
      isArchived,
    }: {
      accountId: FinancialAccountId;
      isArchived: boolean;
    }) =>
      unwrapActionResult(
        await setFinancialAccountArchived(
          organizationId,
          accountId,
          isArchived,
        ),
      ),
    onSuccess: invalidateFinance,
  });
}
