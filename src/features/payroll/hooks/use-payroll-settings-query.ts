import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { getPayrollSettings } from "../actions";

export function getPayrollSettingsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "payroll", "settings"] as const;
}

export function usePayrollSettingsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getPayrollSettingsQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await getPayrollSettings(organizationId)),
  });
}
