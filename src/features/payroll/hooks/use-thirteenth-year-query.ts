import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getThirteenthYear } from "../extra-actions";

export function getThirteenthYearQueryKey(
  organizationId: OrganizationId,
  year: number,
) {
  return [
    "organizations",
    organizationId,
    "payroll",
    "thirteenth",
    year,
  ] as const;
}

export function useThirteenthYearQuery(
  organizationId: OrganizationId,
  year: number,
) {
  return useQuery({
    queryKey: getThirteenthYearQueryKey(organizationId, year),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getThirteenthYear>>(
        organizationApiPath(organizationId, `payroll/thirteenth/${year}`),
      ),
  });
}
