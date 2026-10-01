import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listCategories } from "../actions";

export function getCategoriesQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "categories"] as const;
}

export function useCategoriesQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getCategoriesQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listCategories>>(
        organizationApiPath(organizationId, "categories"),
      ),
  });
}
