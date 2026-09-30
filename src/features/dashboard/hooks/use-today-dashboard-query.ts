import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { getTodayDashboard } from "../actions";

const REFRESH_INTERVAL_IN_MS = 60_000;

export function getTodayDashboardQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "dashboard", "today"] as const;
}

export function useTodayDashboardQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getTodayDashboardQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await getTodayDashboard(organizationId)),
    refetchInterval: REFRESH_INTERVAL_IN_MS,
  });
}
