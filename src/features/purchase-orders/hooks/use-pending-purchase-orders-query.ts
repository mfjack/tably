import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listPendingPurchaseOrders } from "../actions";

export function getPendingPurchaseOrdersQueryKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "purchase-orders",
    "pending",
  ] as const;
}

export function usePendingPurchaseOrdersQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getPendingPurchaseOrdersQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listPendingPurchaseOrders>>(
        organizationApiPath(organizationId, "purchase-orders"),
      ),
  });
}
