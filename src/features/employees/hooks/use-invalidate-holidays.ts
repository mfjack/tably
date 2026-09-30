import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";

export function getInvalidateHolidaysPrefix(organizationId: OrganizationId) {
  return ["organizations", organizationId, "holidays"] as const;
}

export function useInvalidateHolidays(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getInvalidateHolidaysPrefix(organizationId),
      }),
    [queryClient, organizationId],
  );
}
