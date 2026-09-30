import { useMutation } from "@tanstack/react-query";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { registerTimePunch } from "../actions";

import { useInvalidateTimesheets } from "./use-invalidate-timesheets";

export function getRegisterTimePunchMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "time-clock", "register"] as const;
}

export function useRegisterTimePunchMutation(organizationId: OrganizationId) {
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getRegisterTimePunchMutationKey(organizationId),
    mutationFn: async ({
      employeeId,
      pin,
    }: {
      employeeId: EmployeeId;
      pin: string;
    }) =>
      unwrapActionResult(
        await registerTimePunch(organizationId, employeeId, pin),
      ),
    onSuccess: invalidateTimesheets,
  });
}
