import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveFinancialAccount } from "../actions";
import type { AccountInput } from "../schemas";
import type { FinancialAccountId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getSaveFinancialAccountMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "accounts",
    "save",
  ] as const;
}

export function useSaveFinancialAccountMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getSaveFinancialAccountMutationKey(organizationId),
    mutationFn: async ({
      accountId,
      input,
    }: {
      accountId: FinancialAccountId | null;
      input: AccountInput;
    }) =>
      unwrapActionResult(
        await saveFinancialAccount(organizationId, accountId, input),
      ),
    onSuccess: invalidateFinance,
  });
}
