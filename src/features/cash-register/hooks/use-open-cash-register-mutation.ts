import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { openCashSession } from "../actions";
import type { OpenCashSessionInput } from "../schemas";
import { getOpenCashSessionQueryKey } from "./use-open-cash-session-query";

export function getOpenCashRegisterMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "cash-session", "open"] as const;
}

export function useOpenCashRegisterMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getOpenCashRegisterMutationKey(organizationId),
    mutationFn: async (input: OpenCashSessionInput) =>
      unwrapActionResult(await openCashSession(organizationId, input)),
    networkMode: "online",
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: getOpenCashSessionQueryKey(organizationId),
      }),
  });
}
