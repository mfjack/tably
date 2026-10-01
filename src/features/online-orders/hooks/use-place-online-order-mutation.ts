import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { placeOnlineOrder } from "../actions";
import type { PlaceOnlineOrderInput } from "../schemas";

export function getPlaceOnlineOrderMutationKey(menuSlug: string) {
  return ["menus", menuSlug, "online-orders", "place"] as const;
}

export function usePlaceOnlineOrderMutation(menuSlug: string) {
  return useMutation({
    mutationKey: getPlaceOnlineOrderMutationKey(menuSlug),
    mutationFn: async (input: PlaceOnlineOrderInput) =>
      unwrapActionResult(await placeOnlineOrder(menuSlug, input)),
    networkMode: "online",
  });
}
