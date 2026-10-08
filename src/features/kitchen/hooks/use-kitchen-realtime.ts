import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { createClient } from "@/lib/supabase/client";
import { getKitchenTicketsQueryKey } from "./use-kitchen-tickets-query";

export function useKitchenRealtime(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const queryKey = getKitchenTicketsQueryKey(organizationId);
    const refetchTickets = () => {
      void queryClient.invalidateQueries({ queryKey });
    };
    const channel = supabase
      .channel(`kitchen-tickets:${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_tickets",
          filter: `organization_id=eq.${organizationId}`,
        },
        refetchTickets,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refetchTickets();
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);
}
