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

const OPEN_TABS_REFRESH_INTERVAL_IN_MS = 30_000;

export function useOpenOrderTabsQuery(
  organizationId: OrganizationId,
  isEnabled = true,
) {
  return useQuery({
    queryKey: getOpenOrderTabsQueryKey(organizationId),
    enabled: isEnabled,
    refetchInterval: OPEN_TABS_REFRESH_INTERVAL_IN_MS,
    refetchOnWindowFocus: true,
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listOpenOrderTabs>>(
        organizationApiPath(organizationId, "orders/open-tabs"),
      ),
  });
}
