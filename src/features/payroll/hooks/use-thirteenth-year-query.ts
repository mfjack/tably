import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { getThirteenthYear } from "../extra-actions";

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
      unwrapActionResult(await getThirteenthYear(organizationId, year)),
  });
}
