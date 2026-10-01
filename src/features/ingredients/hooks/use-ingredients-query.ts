import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listIngredients } from "../actions";

export function getIngredientsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "ingredients"] as const;
}

export function useIngredientsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getIngredientsQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listIngredients>>(
        organizationApiPath(organizationId, "ingredients"),
      ),
  });
}
