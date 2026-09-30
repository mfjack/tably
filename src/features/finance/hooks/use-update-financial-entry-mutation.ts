import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { updateFinancialEntry } from "../actions";
import type { EntryEditScope, EntryInput } from "../schemas";
import type { FinancialEntryId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getUpdateFinancialEntryMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "entries",
    "update",
  ] as const;
}

export function useUpdateFinancialEntryMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getUpdateFinancialEntryMutationKey(organizationId),
    mutationFn: async ({
      entryId,
      input,
      scope,
    }: {
      entryId: FinancialEntryId;
      input: EntryInput;
      scope: EntryEditScope;
    }) =>
      unwrapActionResult(
        await updateFinancialEntry(organizationId, entryId, input, scope),
      ),
    onSuccess: invalidateFinance,
  });
}
