import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listOperators } from "../actions";

export function getOperatorsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "operators"] as const;
}

export function useOperatorsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getOperatorsQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listOperators>>(
        organizationApiPath(organizationId, "operators"),
      ),
  });
}
