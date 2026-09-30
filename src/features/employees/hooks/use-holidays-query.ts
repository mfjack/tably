import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listHolidays } from "../actions";

export function getHolidaysQueryKey(
  organizationId: OrganizationId,
  year: number,
) {
  return ["organizations", organizationId, "holidays", year] as const;
}

export function useHolidaysQuery(organizationId: OrganizationId, year: number) {
  return useQuery({
    queryKey: getHolidaysQueryKey(organizationId, year),
    queryFn: async () =>
      unwrapActionResult(await listHolidays(organizationId, year)),
  });
}
