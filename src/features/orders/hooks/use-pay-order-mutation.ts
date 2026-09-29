import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import type { OrderPaymentInput } from "../schemas";
import { payOrder } from "../tab-actions";
import type { OrderId } from "../types";
import { useInvalidateOrders } from "./use-invalidate-orders";

type PayOrderVariables = {
  orderId: OrderId;
  payment: OrderPaymentInput;
};

export function getPayOrderMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "pay"] as const;
}

export function usePayOrderMutation(organizationId: OrganizationId) {
  const invalidateOrders = useInvalidateOrders(organizationId);

  return useMutation({
    mutationKey: getPayOrderMutationKey(organizationId),
    mutationFn: async ({ orderId, payment }: PayOrderVariables) =>
      unwrapActionResult(await payOrder(orderId, payment)),
    onSuccess: invalidateOrders,
  });
}
