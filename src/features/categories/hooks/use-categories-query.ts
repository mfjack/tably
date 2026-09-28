import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listCategories } from "../actions";

export function getCategoriesQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "categories"] as const;
}

export function useCategoriesQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getCategoriesQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listCategories(organizationId)),
  });
}
