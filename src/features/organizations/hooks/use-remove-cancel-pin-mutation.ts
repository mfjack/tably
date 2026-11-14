import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { removeCancelPin } from "../actions";
import type { OrganizationId } from "../types";

export function getRemoveCancelPinMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "remove-cancel-pin"] as const;
}

export function useRemoveCancelPinMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getRemoveCancelPinMutationKey(organizationId),
    mutationFn: async () =>
      unwrapActionResult(await removeCancelPin(organizationId)),
  });
}
