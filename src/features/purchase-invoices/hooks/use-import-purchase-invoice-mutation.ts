import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import { useInvalidateFinance } from "@/features/finance/hooks/use-invalidate-finance";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateSuppliers } from "@/features/suppliers/hooks/use-invalidate-suppliers";
import { unwrapActionResult } from "@/lib/action-result";
import { importPurchaseInvoice } from "../actions";
import type { InvoiceImportInput } from "../schemas";

export function getImportPurchaseInvoiceMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "purchase-invoices",
    "import",
  ] as const;
}

export function useImportPurchaseInvoiceMutation(
  organizationId: OrganizationId,
) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);
  const invalidateSuppliers = useInvalidateSuppliers(organizationId);
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getImportPurchaseInvoiceMutationKey(organizationId),
    mutationFn: async (input: InvoiceImportInput) =>
      unwrapActionResult(await importPurchaseInvoice(organizationId, input)),
    onSuccess: () =>
      Promise.all([
        invalidateCatalog(),
        invalidateSuppliers(),
        invalidateFinance(),
      ]),
  });
}
