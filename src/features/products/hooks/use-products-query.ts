import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listProducts } from "../actions";

export function getProductsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "products"] as const;
}

export function useProductsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getProductsQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listProducts>>(
        organizationApiPath(organizationId, "products"),
      ),
  });
}
