import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateTimesheets } from "@/features/time-clock/hooks/use-invalidate-timesheets";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteExtraPayslip } from "../extra-actions";
import type { PayslipId } from "../types";
import { useInvalidatePayroll } from "./use-invalidate-payroll";

export function getDeleteExtraPayslipMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "payroll",
    "extra",
    "delete",
  ] as const;
}

export function useDeleteExtraPayslipMutation(organizationId: OrganizationId) {
  const invalidatePayroll = useInvalidatePayroll(organizationId);
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getDeleteExtraPayslipMutationKey(organizationId),
    mutationFn: async (payslipId: PayslipId) =>
      unwrapActionResult(await deleteExtraPayslip(organizationId, payslipId)),
    onSuccess: () => Promise.all([invalidatePayroll(), invalidateTimesheets()]),
  });
}
