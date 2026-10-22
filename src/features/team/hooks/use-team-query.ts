import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getTeam } from "../actions";

export function getTeamQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "team"] as const;
}

export function useTeamQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getTeamQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getTeam>>(
        organizationApiPath(organizationId, "team"),
      ),
  });
}
