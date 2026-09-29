import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listOpenOrderTabs } from "../tab-actions";

export function getOpenOrderTabsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "open-tabs"] as const;
}

export function useOpenOrderTabsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getOpenOrderTabsQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listOpenOrderTabs(organizationId)),
  });
}
