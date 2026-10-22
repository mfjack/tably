import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { previewFinanceImport } from "../import/actions";
import type { FinanceImportRow } from "../import/schemas";

export function getPreviewFinanceImportMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "import",
    "preview",
  ] as const;
}

export function usePreviewFinanceImportMutation(
  organizationId: OrganizationId,
) {
  return useMutation({
    mutationKey: getPreviewFinanceImportMutationKey(organizationId),
    mutationFn: async (rows: readonly FinanceImportRow[]) =>
      unwrapActionResult(await previewFinanceImport(organizationId, rows)),
  });
}
