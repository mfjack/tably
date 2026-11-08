import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { getAutomaticBillingInvoiceUrl } from "../automatic-billing-actions";

export function getOpenAutomaticBillingInvoiceMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "subscription",
    "automatic-billing-invoice",
  ] as const;
}

export function useOpenAutomaticBillingInvoiceMutation(
  organizationId: OrganizationId,
) {
  return useMutation({
    mutationKey: getOpenAutomaticBillingInvoiceMutationKey(organizationId),
    mutationFn: async () =>
      unwrapActionResult(await getAutomaticBillingInvoiceUrl(organizationId)),
    networkMode: "online",
  });
}
