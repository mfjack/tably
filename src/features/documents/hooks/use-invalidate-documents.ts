import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { getDocumentsQueryKey } from "./use-documents-query";

export function useInvalidateDocuments(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getDocumentsQueryKey(organizationId),
      }),
    [queryClient, organizationId],
  );
}
