import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";

export function getInvalidatePayrollPrefix(organizationId: OrganizationId) {
  return ["organizations", organizationId, "payroll"] as const;
}

export function useInvalidatePayroll(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getInvalidatePayrollPrefix(organizationId),
      }),
    [queryClient, organizationId],
  );
}
