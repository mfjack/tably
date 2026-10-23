import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { removeFinancialEntryAttachment } from "../actions";
import type { FinancialEntryAttachmentId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getRemoveFinancialEntryAttachmentMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "attachments",
    "remove",
  ] as const;
}

export function useRemoveFinancialEntryAttachmentMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getRemoveFinancialEntryAttachmentMutationKey(organizationId),
    mutationFn: async (attachmentId: FinancialEntryAttachmentId) =>
      unwrapActionResult(
        await removeFinancialEntryAttachment(organizationId, attachmentId),
      ),
    onSuccess: invalidateFinance,
  });
}
