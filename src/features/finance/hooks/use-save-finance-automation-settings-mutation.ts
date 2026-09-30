import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveFinanceAutomationSettings } from "../actions";
import type { AutomationSettingsInput } from "../schemas";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getSaveFinanceAutomationSettingsMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "automation",
    "save",
  ] as const;
}

export function useSaveFinanceAutomationSettingsMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getSaveFinanceAutomationSettingsMutationKey(organizationId),
    mutationFn: async (input: AutomationSettingsInput) =>
      unwrapActionResult(
        await saveFinanceAutomationSettings(organizationId, input),
      ),
    onSuccess: invalidateFinance,
  });
}
