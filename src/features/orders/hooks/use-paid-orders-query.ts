import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listPaidOrders } from "../tab-actions";

export function getPaidOrdersQueryKey(
  organizationId: OrganizationId,
  dateKey?: string,
) {
  const baseKey = ["organizations", organizationId, "orders", "paid"] as const;
  return dateKey === undefined ? baseKey : ([...baseKey, dateKey] as const);
}

export function usePaidOrdersQuery(
  organizationId: OrganizationId,
  dateKey: string,
) {
  return useQuery({
    queryKey: getPaidOrdersQueryKey(organizationId, dateKey),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listPaidOrders>>(
        organizationApiPath(
          organizationId,
          "orders/paid",
          dateKey ? { date: dateKey } : undefined,
        ),
      ),
  });
}
