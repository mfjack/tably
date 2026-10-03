import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveOpeningBalance } from "../opening-balance-actions";
import type { OpeningBalanceInput } from "../schemas";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getSaveOpeningBalanceMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "opening-balance",
    "save",
  ] as const;
}

export function useSaveOpeningBalanceMutation(organizationId: OrganizationId) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getSaveOpeningBalanceMutationKey(organizationId),
    mutationFn: async (input: OpeningBalanceInput) =>
      unwrapActionResult(await saveOpeningBalance(organizationId, input)),
    onSuccess: invalidateFinance,
  });
}
