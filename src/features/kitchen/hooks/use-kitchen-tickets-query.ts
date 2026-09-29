import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listActiveKitchenTickets } from "../actions";

export function getKitchenTicketsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "kitchen-tickets"] as const;
}

export function useKitchenTicketsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getKitchenTicketsQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listActiveKitchenTickets(organizationId)),
  });
}
