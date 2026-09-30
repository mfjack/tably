import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useInvalidateEmployees } from "@/features/employees/hooks/use-invalidate-employees";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateTimeClockEmployees } from "@/features/time-clock/hooks/use-invalidate-time-clock-employees";
import { unwrapActionResult } from "@/lib/action-result";
import { resetOperatorPin } from "../actions";
import type { OperatorId } from "../types";
import { getOperatorsQueryKey } from "./use-operators-query";

export function getResetOperatorPinMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "operators", "reset-pin"] as const;
}

export function useResetOperatorPinMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();
  const invalidateEmployees = useInvalidateEmployees(organizationId);
  const invalidateTimeClockEmployees =
    useInvalidateTimeClockEmployees(organizationId);

  return useMutation({
    mutationKey: getResetOperatorPinMutationKey(organizationId),
    mutationFn: async (operatorId: OperatorId) =>
      unwrapActionResult(await resetOperatorPin(organizationId, operatorId)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: getOperatorsQueryKey(organizationId),
        }),
        invalidateEmployees(),
        invalidateTimeClockEmployees(),
      ]),
  });
}
