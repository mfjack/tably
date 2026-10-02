import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getFinanceAutomationSettings } from "../automation-actions";

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
      fetchActionResult<ActionData<typeof getFinanceAutomationSettings>>(
        organizationApiPath(organizationId, "finance/automation"),
      ),
    enabled: isEnabled,
  });
}
