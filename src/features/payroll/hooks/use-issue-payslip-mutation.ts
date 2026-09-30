import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { issuePayslip } from "../actions";
import type { PayslipId } from "../types";

import { useInvalidatePayroll } from "./use-invalidate-payroll";

export function getIssuePayslipMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "payroll", "issue"] as const;
}

export function useIssuePayslipMutation(organizationId: OrganizationId) {
  const invalidatePayroll = useInvalidatePayroll(organizationId);

  return useMutation({
    mutationKey: getIssuePayslipMutationKey(organizationId),
    mutationFn: async (payslipId: PayslipId) =>
      unwrapActionResult(await issuePayslip(organizationId, payslipId)),
    onSuccess: invalidatePayroll,
  });
}
