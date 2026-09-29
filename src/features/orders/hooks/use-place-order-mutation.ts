import { useMutation } from "@tanstack/react-query";
import { useInvalidateCatalog } from "@/features/catalog/use-invalidate-catalog";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { placeOrder } from "../actions";
import type { PlaceOrderInput } from "../schemas";

export function getPlaceOrderMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "orders", "place"] as const;
}

export function usePlaceOrderMutation(organizationId: OrganizationId) {
  const invalidateCatalog = useInvalidateCatalog(organizationId);

  return useMutation({
    mutationKey: getPlaceOrderMutationKey(organizationId),
    mutationFn: async (input: PlaceOrderInput) =>
      unwrapActionResult(await placeOrder(organizationId, input)),
    onSuccess: invalidateCatalog,
  });
}
