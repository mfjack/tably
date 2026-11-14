import { useMutation } from "@tanstack/react-query";
import type { CancelPinInput } from "@/features/orders/cancel-authorization";
import { unwrapActionResult } from "@/lib/action-result";
import { setCancelPin } from "../actions";
import type { OrganizationId } from "../types";

export function getSetCancelPinMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "set-cancel-pin"] as const;
}

export function useSetCancelPinMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getSetCancelPinMutationKey(organizationId),
    mutationFn: async (input: CancelPinInput) =>
      unwrapActionResult(await setCancelPin(organizationId, input)),
  });
}
