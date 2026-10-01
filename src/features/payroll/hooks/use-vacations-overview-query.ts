import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getVacationsOverview } from "../extra-actions";

export function getVacationsOverviewQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "payroll", "vacations"] as const;
}

export function useVacationsOverviewQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getVacationsOverviewQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getVacationsOverview>>(
        organizationApiPath(organizationId, "payroll/vacations"),
      ),
  });
}
