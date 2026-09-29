import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listSupplierPurchases } from "../actions";
import type { SupplierId } from "../types";

export function getSupplierPurchasesQueryKey(
  organizationId: OrganizationId,
  supplierId: SupplierId | null,
) {
  return [
    "organizations",
    organizationId,
    "suppliers",
    supplierId,
    "purchases",
  ] as const;
}

export function useSupplierPurchasesQuery(
  organizationId: OrganizationId,
  supplierId: SupplierId | null,
) {
  return useQuery({
    queryKey: getSupplierPurchasesQueryKey(organizationId, supplierId),
    queryFn: async () =>
      supplierId
        ? unwrapActionResult(await listSupplierPurchases(supplierId))
        : [],
    enabled: supplierId !== null,
  });
}
