import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getOperatorsQueryKey } from "@/features/operators/hooks/use-operators-query";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidatePayroll } from "@/features/payroll/hooks/use-invalidate-payroll";
import { useInvalidateTimeClockEmployees } from "@/features/time-clock/hooks/use-invalidate-time-clock-employees";
import { useInvalidateTimesheets } from "@/features/time-clock/hooks/use-invalidate-timesheets";
import { unwrapActionResult } from "@/lib/action-result";
import { saveEmployee } from "../actions";
import type { EmployeeInput } from "../schemas";
import type { EmployeeId } from "../types";
import { useInvalidateEmployees } from "./use-invalidate-employees";

export function getSaveEmployeeMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "employees", "save"] as const;
}

export function useSaveEmployeeMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();
  const invalidateEmployees = useInvalidateEmployees(organizationId);
  const invalidateTimeClockEmployees =
    useInvalidateTimeClockEmployees(organizationId);
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);
  const invalidatePayroll = useInvalidatePayroll(organizationId);

  return useMutation({
    mutationKey: getSaveEmployeeMutationKey(organizationId),
    mutationFn: async ({
      employeeId,
      input,
    }: {
      employeeId: EmployeeId | null;
      input: EmployeeInput;
    }) =>
      unwrapActionResult(await saveEmployee(organizationId, employeeId, input)),
    onSuccess: () =>
      Promise.all([
        invalidateEmployees(),
        invalidateTimeClockEmployees(),
        invalidateTimesheets(),
        invalidatePayroll(),
        queryClient.invalidateQueries({
          queryKey: getOperatorsQueryKey(organizationId),
        }),
      ]),
  });
}
