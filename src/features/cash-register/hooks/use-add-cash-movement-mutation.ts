import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { addCashMovement } from "../actions";
import type { CashMovementInput } from "../schemas";
import type { CashMovementKind } from "../types";
import { getOpenCashSessionQueryKey } from "./use-open-cash-session-query";

type AddCashMovementVariables = {
  kind: CashMovementKind;
  input: CashMovementInput;
};

export function getAddCashMovementMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "cash-session", "movement"] as const;
}

export function useAddCashMovementMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getAddCashMovementMutationKey(organizationId),
    mutationFn: async ({ kind, input }: AddCashMovementVariables) =>
      unwrapActionResult(await addCashMovement(organizationId, kind, input)),
    networkMode: "online",
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: getOpenCashSessionQueryKey(organizationId),
      }),
  });
}
