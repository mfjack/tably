import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { removeManualPayslipItem } from "../actions";
import type { Payslip } from "../types";

import { useInvalidatePayroll } from "./use-invalidate-payroll";

export function getRemoveManualPayslipItemMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "payroll",
    "remove-manual-item",
  ] as const;
}

export function useRemoveManualPayslipItemMutation(
  organizationId: OrganizationId,
) {
  const invalidatePayroll = useInvalidatePayroll(organizationId);

  return useMutation({
    mutationKey: getRemoveManualPayslipItemMutationKey(organizationId),
    mutationFn: async ({
      payslip,
      manualItemId,
    }: {
      payslip: Payslip;
      manualItemId: string;
    }) =>
      unwrapActionResult(
        await removeManualPayslipItem(organizationId, payslip, manualItemId),
      ),
    onSuccess: invalidatePayroll,
  });
}
