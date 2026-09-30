import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { addManualPayslipItem } from "../actions";
import type { ManualPayslipItemInput } from "../schemas";
import type { Payslip } from "../types";

import { useInvalidatePayroll } from "./use-invalidate-payroll";

export function getAddManualPayslipItemMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "payroll",
    "add-manual-item",
  ] as const;
}

export function useAddManualPayslipItemMutation(
  organizationId: OrganizationId,
) {
  const invalidatePayroll = useInvalidatePayroll(organizationId);

  return useMutation({
    mutationKey: getAddManualPayslipItemMutationKey(organizationId),
    mutationFn: async ({
      payslip,
      input,
    }: {
      payslip: Payslip;
      input: ManualPayslipItemInput;
    }) =>
      unwrapActionResult(
        await addManualPayslipItem(organizationId, payslip, input),
      ),
    onSuccess: invalidatePayroll,
  });
}
