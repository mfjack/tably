import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import { getCustomerAccountsQueryKey } from "@/features/customer-accounts/hooks/use-customer-accounts-query";
import type { OrganizationId } from "@/features/organizations/types";
import { getOpenOrderTabsQueryKey } from "./use-open-order-tabs-query";
import { getPaidOrdersQueryKey } from "./use-paid-orders-query";

export function useInvalidateOrders(organizationId: OrganizationId) {
  const queryClient = useQueryClient();
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useCallback(
    () =>
      Promise.all([
        invalidateCatalog(),
        ...[
          getOpenOrderTabsQueryKey(organizationId),
          getPaidOrdersQueryKey(organizationId),
          getCustomerAccountsQueryKey(organizationId),
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ]),
    [queryClient, invalidateCatalog, organizationId],
  );
}
