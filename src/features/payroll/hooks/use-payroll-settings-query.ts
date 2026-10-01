import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getPayrollSettings } from "../actions";

export function getPayrollSettingsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "payroll", "settings"] as const;
}

export function usePayrollSettingsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getPayrollSettingsQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getPayrollSettings>>(
        organizationApiPath(organizationId, "payroll/settings"),
      ),
  });
}
