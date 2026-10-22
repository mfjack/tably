import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { loadBrowserClient } from "@/lib/supabase/load-browser-client";

type RealtimeTable = "kitchen_tickets" | "online_orders";

export type RealtimeChange = RealtimePostgresChangesPayload<
  Record<string, unknown>
>;

type OrganizationRealtimeOptions = {
  table: RealtimeTable;
  organizationId: OrganizationId;
  onChange: (change: RealtimeChange) => void;
  onSubscribed: () => void;
};

export function useOrganizationRealtime({
  table,
  organizationId,
  onChange,
  onSubscribed,
}: OrganizationRealtimeOptions) {
  const onChangeRef = useRef(onChange);
  const onSubscribedRef = useRef(onSubscribed);

  useEffect(() => {
    onChangeRef.current = onChange;
    onSubscribedRef.current = onSubscribed;
  }, [onChange, onSubscribed]);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    void loadBrowserClient().then((supabase) => {
      if (!isActive) return;
      const channel = supabase
        .channel(`${table}:${organizationId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `organization_id=eq.${organizationId}`,
          },
          (change: RealtimeChange) => onChangeRef.current(change),
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") onSubscribedRef.current();
        });
      unsubscribe = () => {
        void supabase.removeChannel(channel);
      };
    });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [table, organizationId]);
}
