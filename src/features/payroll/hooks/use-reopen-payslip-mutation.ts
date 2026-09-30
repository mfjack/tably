import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { reopenPayslip } from "../actions";
import type { PayslipId } from "../types";

import { useInvalidatePayroll } from "./use-invalidate-payroll";

export function getReopenPayslipMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "payroll", "reopen"] as const;
}

export function useReopenPayslipMutation(organizationId: OrganizationId) {
  const invalidatePayroll = useInvalidatePayroll(organizationId);

  return useMutation({
    mutationKey: getReopenPayslipMutationKey(organizationId),
    mutationFn: async (payslipId: PayslipId) =>
      unwrapActionResult(await reopenPayslip(organizationId, payslipId)),
    onSuccess: invalidatePayroll,
  });
}
