import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { placeWaiterOrder } from "../actions";
import type { PlaceWaiterOrderInput } from "../schemas";

export function getPlaceWaiterOrderMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "waiter-orders", "place"] as const;
}

export function usePlaceWaiterOrderMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getPlaceWaiterOrderMutationKey(organizationId),
    mutationFn: async (input: PlaceWaiterOrderInput) =>
      unwrapActionResult(await placeWaiterOrder(organizationId, input)),
    networkMode: "online",
  });
}
