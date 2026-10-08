import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listStockLosses } from "../actions";

export function getStockLossesQueryKey(
  organizationId: OrganizationId,
  monthKey?: string,
) {
  return monthKey
    ? (["organizations", organizationId, "stock-losses", monthKey] as const)
    : (["organizations", organizationId, "stock-losses"] as const);
}

export function useStockLossesQuery(
  organizationId: OrganizationId,
  monthKey: string,
) {
  return useQuery({
    queryKey: getStockLossesQueryKey(organizationId, monthKey),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listStockLosses>>(
        organizationApiPath(organizationId, "stock-losses", {
          month: monthKey,
        }),
      ),
  });
}
