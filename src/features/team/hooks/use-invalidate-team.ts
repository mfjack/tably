import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { getTeamQueryKey } from "./use-team-query";

export function useInvalidateTeam(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getTeamQueryKey(organizationId),
      }),
    [queryClient, organizationId],
  );
}
