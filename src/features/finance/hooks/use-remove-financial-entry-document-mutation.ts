import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { setFinancialEntryDocument } from "../actions";
import type { FinancialEntryId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getRemoveFinancialEntryDocumentMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "entries",
    "remove-document",
  ] as const;
}

export function useRemoveFinancialEntryDocumentMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getRemoveFinancialEntryDocumentMutationKey(organizationId),
    mutationFn: async ({
      entryId,
      field,
    }: {
      entryId: FinancialEntryId;
      field: "document" | "receipt";
    }) =>
      unwrapActionResult(
        await setFinancialEntryDocument(organizationId, entryId, field, null),
      ),
    onSuccess: invalidateFinance,
  });
}
