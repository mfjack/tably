import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { createClient } from "@/lib/supabase/client";
import { getKitchenTicketsQueryKey } from "./use-kitchen-tickets-query";

export function useKitchenRealtime(
  organizationId: OrganizationId,
  onTicketCreated: () => void,
) {
  const queryClient = useQueryClient();
  const onTicketCreatedRef = useRef(onTicketCreated);

  useEffect(() => {
    onTicketCreatedRef.current = onTicketCreated;
  }, [onTicketCreated]);

  useEffect(() => {
    const supabase = createClient();
    const queryKey = getKitchenTicketsQueryKey(organizationId);
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
        (payload) => {
          if (payload.eventType === "INSERT") onTicketCreatedRef.current();
          void queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);
}
