import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listOpenOrderTabs } from "../tab-actions";

export function getOpenOrderTabsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "open-tabs"] as const;
}

export function useOpenOrderTabsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getOpenOrderTabsQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listOpenOrderTabs>>(
        organizationApiPath(organizationId, "orders/open-tabs"),
      ),
  });
}
