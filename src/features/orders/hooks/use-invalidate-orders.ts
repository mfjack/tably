import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getOpenCashSessionQueryKey } from "@/features/cash-register/hooks/use-open-cash-session-query";
import { getCustomerAccountsQueryKey } from "@/features/customer-accounts/hooks/use-customer-accounts-query";
import { getIngredientsQueryKey } from "@/features/ingredients/hooks/use-ingredients-query";
import type { OrganizationId } from "@/features/organizations/types";
import { getOpenOrderTabsQueryKey } from "./use-open-order-tabs-query";
import { getPaidOrdersQueryKey } from "./use-paid-orders-query";

export function useInvalidateOrders(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    for (const queryKey of [
      getIngredientsQueryKey(organizationId),
      getOpenOrderTabsQueryKey(organizationId),
      getPaidOrdersQueryKey(organizationId),
      getCustomerAccountsQueryKey(organizationId),
      getOpenCashSessionQueryKey(organizationId),
    ]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient, organizationId]);
}
