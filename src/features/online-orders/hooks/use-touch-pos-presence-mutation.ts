import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { touchPosPresence } from "../actions";

export function getTouchPosPresenceMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "pos-presence", "touch"] as const;
}

export function useTouchPosPresenceMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getTouchPosPresenceMutationKey(organizationId),
    mutationFn: async () =>
      unwrapActionResult(await touchPosPresence(organizationId)),
    networkMode: "online",
  });
}
