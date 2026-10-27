import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import { useInvalidateFinance } from "@/features/finance/hooks/use-invalidate-finance";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { cancelPaidOrder } from "../tab-actions";
import type { OrderId } from "../types";
import { useInvalidateOrders } from "./use-invalidate-orders";

export function getCancelPaidOrderMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "cancel-paid"] as const;
}

export function useCancelPaidOrderMutation(organizationId: OrganizationId) {
  const invalidateOrders = useInvalidateOrders(organizationId);
  const invalidateCatalog = useInvalidateCatalog(organizationId);
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getCancelPaidOrderMutationKey(organizationId),
    mutationFn: async (orderId: OrderId) =>
      unwrapActionResult(await cancelPaidOrder(orderId)),
    onSuccess: () => {
      invalidateOrders();
      return Promise.all([invalidateCatalog(), invalidateFinance()]);
    },
  });
}
