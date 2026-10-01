import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listSupplierPurchases } from "../actions";
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
        ? fetchActionResult<ActionData<typeof listSupplierPurchases>>(
            organizationApiPath(
              organizationId,
              `suppliers/${supplierId}/purchases`,
            ),
          )
        : [],
    enabled: supplierId !== null,
  });
}
