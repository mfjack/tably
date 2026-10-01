import { useQuery } from "@tanstack/react-query";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import type { listOwnedOrganizations } from "../actions";

export function getOwnedOrganizationsQueryKey() {
  return ["profile", "owned-organizations"] as const;
}

export function useOwnedOrganizationsQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: getOwnedOrganizationsQueryKey(),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listOwnedOrganizations>>(
        "/api/profile/owned-organizations",
      ),
    enabled: isEnabled,
  });
}
