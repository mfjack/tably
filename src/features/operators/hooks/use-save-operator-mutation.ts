import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveOperator } from "../actions";
import type { OperatorInput } from "../schemas";
import type { OperatorId } from "../types";
import { getOperatorsQueryKey } from "./use-operators-query";

type SaveOperatorVariables = {
  operatorId: OperatorId | null;
  input: OperatorInput;
};

export function getSaveOperatorMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "operators", "save"] as const;
}

export function useSaveOperatorMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getSaveOperatorMutationKey(organizationId),
    mutationFn: async ({ operatorId, input }: SaveOperatorVariables) =>
      unwrapActionResult(await saveOperator(organizationId, operatorId, input)),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getOperatorsQueryKey(organizationId),
      }),
  });
}
