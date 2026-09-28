import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listSupplierSummaries } from "../actions";

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
      unwrapActionResult(await listSupplierSummaries(organizationId)),
    enabled: isEnabled,
  });
}
