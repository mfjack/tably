import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { placeOrder } from "../actions";
import type { OrderRequestInput, PlaceOrderInput } from "../schemas";
import { useInvalidateOrders } from "./use-invalidate-orders";

type PlaceOrderVariables = {
  input: PlaceOrderInput;
  request: OrderRequestInput;
};

export function getPlaceOrderMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "place"] as const;
}

export function usePlaceOrderMutation(organizationId: OrganizationId) {
  const invalidateOrders = useInvalidateOrders(organizationId);

  return useMutation({
    mutationKey: getPlaceOrderMutationKey(organizationId),
    mutationFn: async ({ input, request }: PlaceOrderVariables) =>
      unwrapActionResult(await placeOrder(organizationId, input, request)),
    onSuccess: invalidateOrders,
  });
}
