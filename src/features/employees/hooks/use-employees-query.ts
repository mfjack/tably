import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listEmployees } from "../actions";

export function getEmployeesQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "employees", "list"] as const;
}

export function useEmployeesQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getEmployeesQueryKey(organizationId),
    queryFn: async () =>
      unwrapActionResult(await listEmployees(organizationId)),
  });
}
