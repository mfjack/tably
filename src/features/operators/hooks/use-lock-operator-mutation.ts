import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { lockOperator } from "../actions";

export function getLockOperatorMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "operators", "lock"] as const;
}

export function useLockOperatorMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getLockOperatorMutationKey(organizationId),
    mutationFn: async () =>
      unwrapActionResult(await lockOperator(organizationId)),
  });
}
