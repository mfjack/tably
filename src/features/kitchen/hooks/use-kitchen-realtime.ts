import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { useOrganizationRealtime } from "@/hooks/use-organization-realtime";
import { getKitchenTicketsQueryKey } from "./use-kitchen-tickets-query";

export function useKitchenRealtime(organizationId: OrganizationId) {
  const queryClient = useQueryClient();
  const refetchTickets = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: getKitchenTicketsQueryKey(organizationId),
    });
  }, [queryClient, organizationId]);

  useOrganizationRealtime({
    table: "kitchen_tickets",
    organizationId,
    onChange: refetchTickets,
    onSubscribed: refetchTickets,
  });
}
