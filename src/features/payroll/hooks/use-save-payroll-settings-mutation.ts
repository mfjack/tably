import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { savePayrollSettings } from "../actions";
import type { PayrollSettingsInput } from "../schemas";

import { useInvalidatePayroll } from "./use-invalidate-payroll";

export function getSavePayrollSettingsMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "payroll", "save-settings"] as const;
}

export function useSavePayrollSettingsMutation(organizationId: OrganizationId) {
  const invalidatePayroll = useInvalidatePayroll(organizationId);

  return useMutation({
    mutationKey: getSavePayrollSettingsMutationKey(organizationId),
    mutationFn: async (input: PayrollSettingsInput) =>
      unwrapActionResult(await savePayrollSettings(organizationId, input)),
    onSuccess: invalidatePayroll,
  });
}
