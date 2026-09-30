import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { payFinancialEntry } from "../actions";
import type { PayEntryInput } from "../schemas";
import type { FinancialEntryId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getPayFinancialEntryMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "entries",
    "pay",
  ] as const;
}

export function usePayFinancialEntryMutation(organizationId: OrganizationId) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getPayFinancialEntryMutationKey(organizationId),
    mutationFn: async ({
      entryId,
      input,
    }: {
      entryId: FinancialEntryId;
      input: PayEntryInput;
    }) =>
      unwrapActionResult(
        await payFinancialEntry(organizationId, entryId, input),
      ),
    onSuccess: invalidateFinance,
  });
}
