import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listPaidOrders } from "../tab-actions";

export function getPaidOrdersQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "paid"] as const;
}

export function usePaidOrdersQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getPaidOrdersQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listPaidOrders(organizationId)),
  });
}
