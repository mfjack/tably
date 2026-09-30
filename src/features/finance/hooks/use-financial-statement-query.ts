import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { getFinancialStatement } from "../actions";
import type { FinancialAccountId } from "../types";

export function getFinancialStatementQueryKey(
  organizationId: OrganizationId,
  monthKey: string,
  accountId: FinancialAccountId | null,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "statement",
    monthKey,
    accountId,
  ] as const;
}

export function useFinancialStatementQuery(
  organizationId: OrganizationId,
  monthKey: string,
  accountId: FinancialAccountId | null,
) {
  return useQuery({
    queryKey: getFinancialStatementQueryKey(
      organizationId,
      monthKey,
      accountId,
    ),
    queryFn: async () =>
      unwrapActionResult(
        await getFinancialStatement(organizationId, monthKey, accountId),
      ),
  });
}
