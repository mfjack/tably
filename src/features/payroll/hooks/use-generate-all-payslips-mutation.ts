import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { generateAllPayslips } from "../actions";

import { useInvalidatePayroll } from "./use-invalidate-payroll";

export function getGenerateAllPayslipsMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "payroll", "generate-all"] as const;
}

export function useGenerateAllPayslipsMutation(organizationId: OrganizationId) {
  const invalidatePayroll = useInvalidatePayroll(organizationId);

  return useMutation({
    mutationKey: getGenerateAllPayslipsMutationKey(organizationId),
    mutationFn: async (monthKey: string) =>
      unwrapActionResult(await generateAllPayslips(organizationId, monthKey)),
    onSuccess: invalidatePayroll,
  });
}
