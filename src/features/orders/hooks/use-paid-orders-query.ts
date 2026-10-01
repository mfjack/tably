import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listPaidOrders } from "../tab-actions";

export function getPaidOrdersQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "paid"] as const;
}

export function usePaidOrdersQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getPaidOrdersQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listPaidOrders>>(
        organizationApiPath(organizationId, "orders/paid"),
      ),
  });
}
