import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidatePayroll } from "@/features/payroll/hooks/use-invalidate-payroll";
import { useInvalidateTimeClockEmployees } from "@/features/time-clock/hooks/use-invalidate-time-clock-employees";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteEmployee } from "../actions";
import type { EmployeeId } from "../types";
import { useInvalidateEmployees } from "./use-invalidate-employees";

export function getDeleteEmployeeMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "employees", "delete"] as const;
}

export function useDeleteEmployeeMutation(organizationId: OrganizationId) {
  const invalidateEmployees = useInvalidateEmployees(organizationId);
  const invalidateTimeClockEmployees =
    useInvalidateTimeClockEmployees(organizationId);
  const invalidatePayroll = useInvalidatePayroll(organizationId);

  return useMutation({
    mutationKey: getDeleteEmployeeMutationKey(organizationId),
    mutationFn: async (employeeId: EmployeeId) =>
      unwrapActionResult(await deleteEmployee(organizationId, employeeId)),
    onSuccess: () =>
      Promise.all([
        invalidateEmployees(),
        invalidateTimeClockEmployees(),
        invalidatePayroll(),
      ]),
  });
}
