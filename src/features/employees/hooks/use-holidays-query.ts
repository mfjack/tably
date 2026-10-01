import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listHolidays } from "../actions";

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
      fetchActionResult<ActionData<typeof listHolidays>>(
        organizationApiPath(organizationId, "holidays", { year }),
      ),
  });
}
