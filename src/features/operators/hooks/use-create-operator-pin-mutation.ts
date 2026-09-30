import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { createOperatorPin } from "../actions";
import type { OperatorId } from "../types";

type CreateOperatorPinVariables = {
  operatorId: OperatorId;
  pin: string;
};

export function getCreateOperatorPinMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "operators", "create-pin"] as const;
}

export function useCreateOperatorPinMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getCreateOperatorPinMutationKey(organizationId),
    mutationFn: async ({ operatorId, pin }: CreateOperatorPinVariables) =>
      unwrapActionResult(
        await createOperatorPin(organizationId, operatorId, pin),
      ),
  });
}
