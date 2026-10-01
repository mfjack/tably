import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getOpenCashSession } from "../actions";

const CASH_SESSION_REFRESH_INTERVAL_IN_MS = 60_000;

export function getOpenCashSessionQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "cash-session"] as const;
}

export function useOpenCashSessionQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getOpenCashSessionQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getOpenCashSession>>(
        organizationApiPath(organizationId, "cash-session"),
      ),
    refetchInterval: CASH_SESSION_REFRESH_INTERVAL_IN_MS,
  });
}
