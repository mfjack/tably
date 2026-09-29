import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { getTaskListsQueryKey } from "./use-task-lists-query";

export function useInvalidateTaskLists(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getTaskListsQueryKey(organizationId),
      }),
    [queryClient, organizationId],
  );
}
