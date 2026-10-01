import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { closeCashSession } from "../actions";
import type { CloseCashSessionInput } from "../schemas";
import { getOpenCashSessionQueryKey } from "./use-open-cash-session-query";

export function getCloseCashRegisterMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "cash-session", "close"] as const;
}

export function useCloseCashRegisterMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getCloseCashRegisterMutationKey(organizationId),
    mutationFn: async (input: CloseCashSessionInput) =>
      unwrapActionResult(await closeCashSession(organizationId, input)),
    networkMode: "online",
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: getOpenCashSessionQueryKey(organizationId),
      }),
  });
}
