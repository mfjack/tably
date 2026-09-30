import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listFinancialCategories } from "../actions";

export function getFinancialCategoriesQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "finance", "categories"] as const;
}

export function useFinancialCategoriesQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getFinancialCategoriesQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listFinancialCategories(organizationId)),
  });
}
