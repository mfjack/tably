import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listCashSessions } from "../actions";

export function getCashSessionsQueryKey(
  organizationId: OrganizationId,
  startDate: string,
  endDate: string,
) {
  return [
    "organizations",
    organizationId,
    "cash-sessions",
    startDate,
    endDate,
  ] as const;
}

export function useCashSessionsQuery(
  organizationId: OrganizationId,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: getCashSessionsQueryKey(organizationId, startDate, endDate),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listCashSessions>>(
        organizationApiPath(organizationId, "cash-sessions", {
          start: startDate,
          end: endDate,
        }),
      ),
  });
}
