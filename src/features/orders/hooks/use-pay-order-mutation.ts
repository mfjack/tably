import { useMutation } from "@tanstack/react-query";
import { useInvalidateLoyalty } from "@/features/loyalty/hooks/use-invalidate-loyalty";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import type { OrderAdjustmentsInput } from "../order-adjustments";
import type { OrderPaymentInput } from "../schemas";
import { payOrder } from "../tab-actions";
import type { OrderId } from "../types";
import { useInvalidateOrders } from "./use-invalidate-orders";

type PayOrderVariables = {
  orderId: OrderId;
  payments: OrderPaymentInput[];
  adjustments: OrderAdjustmentsInput;
};

export function getPayOrderMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "pay"] as const;
}

export function usePayOrderMutation(organizationId: OrganizationId) {
  const invalidateOrders = useInvalidateOrders(organizationId);
  const invalidateLoyalty = useInvalidateLoyalty(organizationId);

  function handleSuccess(_data: unknown, { adjustments }: PayOrderVariables) {
    void invalidateOrders();
    if (adjustments.loyalty) void invalidateLoyalty();
  }

  return useMutation({
    mutationKey: getPayOrderMutationKey(organizationId),
    mutationFn: async ({ orderId, payments, adjustments }: PayOrderVariables) =>
      unwrapActionResult(await payOrder(orderId, payments, adjustments)),
    onSuccess: handleSuccess,
  });
}
