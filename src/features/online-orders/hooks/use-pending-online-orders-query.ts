import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listPendingOnlineOrders } from "../actions";

const PENDING_ONLINE_ORDERS_REFRESH_INTERVAL_IN_MS = 15_000;

export function getPendingOnlineOrdersQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "online-orders", "pending"] as const;
}

export function usePendingOnlineOrdersQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getPendingOnlineOrdersQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listPendingOnlineOrders>>(
        organizationApiPath(organizationId, "online-orders"),
      ),
    refetchInterval: PENDING_ONLINE_ORDERS_REFRESH_INTERVAL_IN_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}
