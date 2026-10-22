import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { hasStockLosses } from "../actions";
import { getStockLossesQueryKey } from "./use-stock-losses-query";

export function getHasStockLossesQueryKey(organizationId: OrganizationId) {
  return [...getStockLossesQueryKey(organizationId), "exists"] as const;
}

export function useHasStockLossesQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getHasStockLossesQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof hasStockLosses>>(
        organizationApiPath(organizationId, "stock-losses/exists"),
      ),
  });
}
