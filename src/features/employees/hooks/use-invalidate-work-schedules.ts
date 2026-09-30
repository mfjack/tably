import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";

export function getInvalidateWorkSchedulesPrefix(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "work-schedules"] as const;
}

export function useInvalidateWorkSchedules(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getInvalidateWorkSchedulesPrefix(organizationId),
      }),
    [queryClient, organizationId],
  );
}
