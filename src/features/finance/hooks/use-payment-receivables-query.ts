import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { getPaymentReceivables } from "../receivables-actions";

export function getPaymentReceivablesQueryKey(
  organizationId: OrganizationId,
  startDate: string,
  endDate: string,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "receivables",
    startDate,
    endDate,
  ] as const;
}

export function usePaymentReceivablesQuery(
  organizationId: OrganizationId,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: getPaymentReceivablesQueryKey(organizationId, startDate, endDate),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getPaymentReceivables>>(
        organizationApiPath(organizationId, "finance/receivables", {
          from: startDate,
          to: endDate,
        }),
      ),
  });
}
