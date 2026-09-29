import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listSuppliers } from "../actions";

export function getSuppliersQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "suppliers", "list"] as const;
}

export function useSuppliersQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getSuppliersQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listSuppliers(organizationId)),
  });
}
