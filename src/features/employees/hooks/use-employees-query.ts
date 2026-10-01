import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listEmployees } from "../actions";

export function getEmployeesQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "employees", "list"] as const;
}

export function useEmployeesQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getEmployeesQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listEmployees>>(
        organizationApiPath(organizationId, "employees"),
      ),
  });
}
