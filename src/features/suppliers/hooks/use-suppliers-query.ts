import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listSuppliers } from "../actions";

export function getSuppliersQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "suppliers", "list"] as const;
}

export function useSuppliersQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getSuppliersQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listSuppliers>>(
        organizationApiPath(organizationId, "suppliers"),
      ),
  });
}
