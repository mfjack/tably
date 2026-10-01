import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { createClient } from "@/lib/supabase/client";
import { getPendingOnlineOrdersQueryKey } from "./use-pending-online-orders-query";

export function useOnlineOrdersRealtime(
  organizationId: OrganizationId,
  onOrderCreated: (customerName: string) => void,
) {
  const queryClient = useQueryClient();
  const onOrderCreatedRef = useRef(onOrderCreated);

  useEffect(() => {
    onOrderCreatedRef.current = onOrderCreated;
  }, [onOrderCreated]);

  useEffect(() => {
    const supabase = createClient();
    const queryKey = getPendingOnlineOrdersQueryKey(organizationId);
    const channel = supabase
      .channel(`online-orders:${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "online_orders",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const customerName = payload.new.customer_name;
            onOrderCreatedRef.current(
              typeof customerName === "string" ? customerName : "",
            );
          }
          void queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);
}
