import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listDocuments } from "../actions";

export function getDocumentsQueryKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "documents", "list"] as const;
}

export function useDocumentsQuery(organizationId: OrganizationId) {
  return useQuery({
    queryKey: getDocumentsQueryKey(organizationId),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listDocuments>>(
        organizationApiPath(organizationId, "documents"),
      ),
  });
}
