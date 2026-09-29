import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { unlockOperator } from "../actions";
import type { OperatorId } from "../types";

type UnlockOperatorVariables = {
  operatorId: OperatorId;
  pin: string;
};

export function getUnlockOperatorMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "operators", "unlock"] as const;
}

export function useUnlockOperatorMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getUnlockOperatorMutationKey(organizationId),
    mutationFn: async ({ operatorId, pin }: UnlockOperatorVariables) =>
      unwrapActionResult(await unlockOperator(organizationId, operatorId, pin)),
  });
}
