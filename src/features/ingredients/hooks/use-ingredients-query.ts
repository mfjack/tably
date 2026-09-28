import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listIngredients } from "../actions";

export function getIngredientsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "ingredients"] as const;
}

export function useIngredientsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getIngredientsQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listIngredients(organizationId)),
  });
}
