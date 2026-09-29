import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteOperator } from "../actions";
import type { OperatorId } from "../types";
import { getOperatorsQueryKey } from "./use-operators-query";

export function getDeleteOperatorMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "operators", "delete"] as const;
}

export function useDeleteOperatorMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getDeleteOperatorMutationKey(organizationId),
    mutationFn: async (operatorId: OperatorId) =>
      unwrapActionResult(await deleteOperator(organizationId, operatorId)),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getOperatorsQueryKey(organizationId),
      }),
  });
}
