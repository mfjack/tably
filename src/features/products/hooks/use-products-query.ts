import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listProducts } from "../actions";

export function getProductsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "products"] as const;
}

export function useProductsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getProductsQueryKey(organizationId),
    queryFn: async () => unwrapActionResult(await listProducts(organizationId)),
  });
}
