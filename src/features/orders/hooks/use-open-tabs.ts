import { useMemo } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { usePendingQueuedTabs } from "@/features/pos/hooks/use-pending-queued-tabs";
import type { OrderDetails } from "../types";
import { useOpenOrderTabsQuery } from "./use-open-order-tabs-query";

function compareNewestFirst(first: OrderDetails, second: OrderDetails) {
  return (
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );
}

export function useOpenTabs(organizationId: OrganizationId, isEnabled = true) {
  const openOrderTabsQuery = useOpenOrderTabsQuery(organizationId, isEnabled);
  const { pendingTabs, paidOrderIds } = usePendingQueuedTabs(organizationId);
  const openTabs = useMemo(
    () =>
      openOrderTabsQuery.data &&
      [
        ...pendingTabs,
        ...openOrderTabsQuery.data.filter(
          (order) => !paidOrderIds.has(order.id),
        ),
      ].sort(compareNewestFirst),
    [openOrderTabsQuery.data, pendingTabs, paidOrderIds],
  );

  return {
    openTabs,
    isLoading: openOrderTabsQuery.isPending,
    errorMessage: openOrderTabsQuery.error?.message,
  };
}
