import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getOpenCashSessionQueryKey } from "@/features/cash-register/hooks/use-open-cash-session-query";
import { getCustomerAccountsQueryKey } from "@/features/customer-accounts/hooks/use-customer-accounts-query";
import { getIngredientsQueryKey } from "@/features/ingredients/hooks/use-ingredients-query";
import type { OrganizationId } from "@/features/organizations/types";
import { getOpenOrderTabsQueryKey } from "./use-open-order-tabs-query";
import { getPaidOrdersQueryKey } from "./use-paid-orders-query";

type InvalidateOrdersOptions = {
  shouldRefetchRelated: boolean;
};

function getOrderListQueryKeys(organizationId: OrganizationId): QueryKey[] {
  return [
    getOpenOrderTabsQueryKey(organizationId),
    getPaidOrdersQueryKey(organizationId),
    getOpenCashSessionQueryKey(organizationId),
  ];
}

function getOrderRelatedQueryKeys(organizationId: OrganizationId): QueryKey[] {
  return [
    getIngredientsQueryKey(organizationId),
    getCustomerAccountsQueryKey(organizationId),
  ];
}

export function useInvalidateOrders(
  organizationId: OrganizationId,
  { shouldRefetchRelated }: InvalidateOrdersOptions = {
    shouldRefetchRelated: true,
  },
) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    for (const queryKey of getOrderListQueryKeys(organizationId)) {
      void queryClient.invalidateQueries({ queryKey });
    }
    for (const queryKey of getOrderRelatedQueryKeys(organizationId)) {
      void queryClient.invalidateQueries({
        queryKey,
        refetchType: shouldRefetchRelated ? "active" : "none",
      });
    }
  }, [queryClient, organizationId, shouldRefetchRelated]);
}
