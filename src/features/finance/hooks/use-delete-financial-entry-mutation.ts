import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteFinancialEntry } from "../actions";
import type { EntryDeleteScope } from "../schemas";
import type { FinancialEntryId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getDeleteFinancialEntryMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "entries",
    "delete",
  ] as const;
}

export function useDeleteFinancialEntryMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getDeleteFinancialEntryMutationKey(organizationId),
    mutationFn: async ({
      entryId,
      scope,
    }: {
      entryId: FinancialEntryId;
      scope: EntryDeleteScope;
    }) =>
      unwrapActionResult(
        await deleteFinancialEntry(organizationId, entryId, scope),
      ),
    onSuccess: invalidateFinance,
  });
}
