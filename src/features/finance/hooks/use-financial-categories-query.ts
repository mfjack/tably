import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listFinancialCategories } from "../category-actions";

export function getFinancialCategoriesQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "finance", "categories"] as const;
}

export function useFinancialCategoriesQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getFinancialCategoriesQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listFinancialCategories>>(
        organizationApiPath(organizationId, "finance/categories"),
      ),
  });
}
