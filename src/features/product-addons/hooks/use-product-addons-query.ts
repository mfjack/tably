import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listProductAddons } from "../actions";

export function getProductAddonsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "product-addons"] as const;
}

export function useProductAddonsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getProductAddonsQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listProductAddons>>(
        organizationApiPath(organizationId, "product-addons"),
      ),
  });
}
