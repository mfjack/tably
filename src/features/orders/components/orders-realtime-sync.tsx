"use client";

import type { OrganizationId } from "@/features/organizations/types";
import { useOrdersRealtime } from "../hooks/use-orders-realtime";

type OrdersRealtimeSyncProps = {
  organizationId: OrganizationId;
};

export function OrdersRealtimeSync({
  organizationId,
}: OrdersRealtimeSyncProps) {
  useOrdersRealtime(organizationId);
  return null;
}
