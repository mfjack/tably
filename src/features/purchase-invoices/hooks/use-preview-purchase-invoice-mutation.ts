import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { previewPurchaseInvoice } from "../actions";
import type { PurchaseInvoice } from "../types";

export function getPreviewPurchaseInvoiceMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "purchase-invoices",
    "preview",
  ] as const;
}

export function usePreviewPurchaseInvoiceMutation(
  organizationId: OrganizationId,
) {
  return useMutation({
    mutationKey: getPreviewPurchaseInvoiceMutationKey(organizationId),
    mutationFn: async (invoice: PurchaseInvoice) =>
      unwrapActionResult(await previewPurchaseInvoice(organizationId, invoice)),
  });
}
