import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getOperatorsQueryKey } from "@/features/operators/hooks/use-operators-query";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateTimeClockEmployees } from "@/features/time-clock/hooks/use-invalidate-time-clock-employees";
import { unwrapActionResult } from "@/lib/action-result";
import { resetEmployeePin } from "../actions";
import type { EmployeeId } from "../types";
import { useInvalidateEmployees } from "./use-invalidate-employees";

export function getResetEmployeePinMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "employees", "reset-pin"] as const;
}

export function useResetEmployeePinMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();
  const invalidateEmployees = useInvalidateEmployees(organizationId);
  const invalidateTimeClockEmployees =
    useInvalidateTimeClockEmployees(organizationId);

  return useMutation({
    mutationKey: getResetEmployeePinMutationKey(organizationId),
    mutationFn: async (employeeId: EmployeeId) =>
      unwrapActionResult(await resetEmployeePin(organizationId, employeeId)),
    onSuccess: () =>
      Promise.all([
        invalidateEmployees(),
        invalidateTimeClockEmployees(),
        queryClient.invalidateQueries({
          queryKey: getOperatorsQueryKey(organizationId),
        }),
      ]),
  });
}
