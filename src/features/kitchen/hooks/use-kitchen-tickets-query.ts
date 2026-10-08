import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listActiveKitchenTickets } from "../actions";

const KITCHEN_TICKETS_REFRESH_INTERVAL_IN_MS = 15_000;

export function getKitchenTicketsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "kitchen-tickets"] as const;
}

export function useKitchenTicketsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getKitchenTicketsQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listActiveKitchenTickets>>(
        organizationApiPath(organizationId, "kitchen-tickets"),
      ),
    refetchInterval: KITCHEN_TICKETS_REFRESH_INTERVAL_IN_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}
