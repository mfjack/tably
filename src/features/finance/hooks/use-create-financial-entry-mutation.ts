import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { createFinancialEntry } from "../actions";
import type { EntryInput } from "../schemas";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getCreateFinancialEntryMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "entries",
    "create",
  ] as const;
}

export function useCreateFinancialEntryMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getCreateFinancialEntryMutationKey(organizationId),
    mutationFn: async (input: EntryInput) =>
      unwrapActionResult(await createFinancialEntry(organizationId, input)),
    onSuccess: invalidateFinance,
  });
}
