import { useQuery } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { listOwnedOrganizations } from "../actions";

export function getOwnedOrganizationsQueryKey() {
  return ["profile", "owned-organizations"] as const;
}

export function useOwnedOrganizationsQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: getOwnedOrganizationsQueryKey(),
    queryFn: async () => unwrapActionResult(await listOwnedOrganizations()),
    enabled: isEnabled,
  });
}
