import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { importFinanceEntries } from "../import/actions";
import type { FinanceImportRow } from "../import/schemas";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getImportFinanceEntriesMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "import",
    "save",
  ] as const;
}

export function useImportFinanceEntriesMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getImportFinanceEntriesMutationKey(organizationId),
    mutationFn: async (rows: readonly FinanceImportRow[]) =>
      unwrapActionResult(await importFinanceEntries(organizationId, rows)),
    onSuccess: invalidateFinance,
  });
}
