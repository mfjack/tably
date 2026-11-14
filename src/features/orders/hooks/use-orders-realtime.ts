import type { OrganizationId } from "@/features/organizations/types";
import { useOrganizationRealtime } from "@/hooks/use-organization-realtime";
import { useInvalidateOrders } from "./use-invalidate-orders";

export function useOrdersRealtime(organizationId: OrganizationId) {
  const invalidateOrders = useInvalidateOrders(organizationId, {
    shouldRefetchRelated: false,
  });

  useOrganizationRealtime({
    table: "orders",
    organizationId,
    onChange: invalidateOrders,
    onSubscribed: invalidateOrders,
  });
}
