import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listSupplierSummaries } from "../actions";

export function getSupplierSummariesQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "suppliers", "summaries"] as const;
}

export function useSupplierSummariesQuery(
  organizationId: OrganizationId,
  isEnabled = true,
) {
  return useQuery({
    queryKey: getSupplierSummariesQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listSupplierSummaries>>(
        organizationApiPath(organizationId, "suppliers/summaries"),
      ),
    enabled: isEnabled,
  });
}
