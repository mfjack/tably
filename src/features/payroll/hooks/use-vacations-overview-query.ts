import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { getVacationsOverview } from "../extra-actions";

export function getVacationsOverviewQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "payroll", "vacations"] as const;
}

export function useVacationsOverviewQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getVacationsOverviewQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await getVacationsOverview(organizationId)),
  });
}
