import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type RealtimeChange,
  useOrganizationRealtime,
} from "@/hooks/use-organization-realtime";
import { getPendingOnlineOrdersQueryKey } from "./use-pending-online-orders-query";

export function useOnlineOrdersRealtime(
  organizationId: OrganizationId,
  onOrderCreated: (customerName: string) => void,
) {
  const queryClient = useQueryClient();
  const refetchOrders = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: getPendingOnlineOrdersQueryKey(organizationId),
    });
  }, [queryClient, organizationId]);

  const handleChange = useCallback(
    (change: RealtimeChange) => {
      if (change.eventType === "INSERT") {
        const customerName = change.new.customer_name;
        onOrderCreated(typeof customerName === "string" ? customerName : "");
      }
      refetchOrders();
    },
    [onOrderCreated, refetchOrders],
  );

  useOrganizationRealtime({
    table: "online_orders",
    organizationId,
    onChange: handleChange,
    onSubscribed: refetchOrders,
  });
}
