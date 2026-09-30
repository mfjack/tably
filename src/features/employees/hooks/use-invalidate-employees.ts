import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";

export function getInvalidateEmployeesPrefix(organizationId: OrganizationId) {
  return ["organizations", organizationId, "employees"] as const;
}

export function useInvalidateEmployees(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getInvalidateEmployeesPrefix(organizationId),
      }),
    [queryClient, organizationId],
  );
}
