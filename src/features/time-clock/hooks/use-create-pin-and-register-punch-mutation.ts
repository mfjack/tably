import { useMutation } from "@tanstack/react-query";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { createPinAndRegisterPunch } from "../actions";
import { useInvalidateTimeClockEmployees } from "./use-invalidate-time-clock-employees";
import { useInvalidateTimesheets } from "./use-invalidate-timesheets";

type CreatePinAndRegisterPunchVariables = {
  employeeId: EmployeeId;
  pin: string;
};

export function getCreatePinAndRegisterPunchMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "time-clock", "create-pin"] as const;
}

export function useCreatePinAndRegisterPunchMutation(
  organizationId: OrganizationId,
) {
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);
  const invalidateTimeClockEmployees =
    useInvalidateTimeClockEmployees(organizationId);

  return useMutation({
    mutationKey: getCreatePinAndRegisterPunchMutationKey(organizationId),
    mutationFn: async ({
      employeeId,
      pin,
    }: CreatePinAndRegisterPunchVariables) =>
      unwrapActionResult(
        await createPinAndRegisterPunch(organizationId, employeeId, pin),
      ),
    onSuccess: () =>
      Promise.all([invalidateTimesheets(), invalidateTimeClockEmployees()]),
  });
}
