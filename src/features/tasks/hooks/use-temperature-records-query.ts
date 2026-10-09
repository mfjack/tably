import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listTemperatureRecords } from "../actions";

export function getTemperatureRecordsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "temperature-records"] as const;
}

export function useTemperatureRecordsQuery(
  organizationId: OrganizationId,
  isEnabled: boolean,
) {
  return useQuery({
    queryKey: getTemperatureRecordsQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listTemperatureRecords>>(
        organizationApiPath(organizationId, "temperature-records"),
      ),
    enabled: isEnabled,
  });
}
