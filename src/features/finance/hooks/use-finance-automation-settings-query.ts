import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { getFinanceAutomationSettings } from "../actions";

export function getFinanceAutomationSettingsQueryKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "finance", "automation"] as const;
}

export function useFinanceAutomationSettingsQuery(
  organizationId: OrganizationId,
  isEnabled: boolean,
) {
  return useQuery({
    queryKey: getFinanceAutomationSettingsQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await getFinanceAutomationSettings(organizationId)),
    enabled: isEnabled,
  });
}
