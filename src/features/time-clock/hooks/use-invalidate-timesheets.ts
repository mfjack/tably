import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";

export function getInvalidateTimesheetsPrefix(organizationId: OrganizationId) {
  return ["organizations", organizationId, "timesheets"] as const;
}

export function useInvalidateTimesheets(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getInvalidateTimesheetsPrefix(organizationId),
      }),
    [queryClient, organizationId],
  );
}
