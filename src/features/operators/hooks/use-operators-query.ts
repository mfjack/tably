import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listOperators } from "../actions";

export function getOperatorsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "operators"] as const;
}

export function useOperatorsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getOperatorsQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listOperators(organizationId)),
  });
}
