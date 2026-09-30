import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";

export function getInvalidateTimeClockEmployeesPrefix(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "time-clock-employees"] as const;
}

export function useInvalidateTimeClockEmployees(
  organizationId: OrganizationId,
) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getInvalidateTimeClockEmployeesPrefix(organizationId),
      }),
    [queryClient, organizationId],
  );
}
