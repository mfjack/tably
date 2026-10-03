import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import { getLoyaltyCustomersQueryKey } from "./use-loyalty-customers-query";

export function useInvalidateLoyalty(organizationId: OrganizationId) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getLoyaltyCustomersQueryKey(organizationId),
      }),
    [queryClient, organizationId],
  );
}
