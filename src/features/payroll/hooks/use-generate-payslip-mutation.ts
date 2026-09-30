import { useMutation } from "@tanstack/react-query";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { generatePayslip } from "../actions";

import { useInvalidatePayroll } from "./use-invalidate-payroll";

export function getGeneratePayslipMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "payroll", "generate"] as const;
}

export function useGeneratePayslipMutation(organizationId: OrganizationId) {
  const invalidatePayroll = useInvalidatePayroll(organizationId);

  return useMutation({
    mutationKey: getGeneratePayslipMutationKey(organizationId),
    mutationFn: async ({
      employeeId,
      monthKey,
    }: {
      employeeId: EmployeeId;
      monthKey: string;
    }) =>
      unwrapActionResult(
        await generatePayslip(organizationId, employeeId, monthKey),
      ),
    onSuccess: invalidatePayroll,
  });
}
