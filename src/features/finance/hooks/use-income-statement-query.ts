import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getIncomeStatement } from "../income-statement/actions";

export function getIncomeStatementQueryKey(
  organizationId: OrganizationId,
  monthKey: string,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "income-statement",
    monthKey,
  ] as const;
}

export function useIncomeStatementQuery(
  organizationId: OrganizationId,
  monthKey: string,
) {
  return useQuery({
    queryKey: getIncomeStatementQueryKey(organizationId, monthKey),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getIncomeStatement>>(
        organizationApiPath(organizationId, "finance/income-statement", {
          month: monthKey,
        }),
      ),
  });
}
