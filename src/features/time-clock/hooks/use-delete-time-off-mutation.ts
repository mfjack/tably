import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteTimeOff } from "../actions";
import type { TimeOffId } from "../types";

import { useInvalidateTimesheets } from "./use-invalidate-timesheets";

export function getDeleteTimeOffMutationKey(organizationId: OrganizationId) {
  return [
    "organizations",
    organizationId,
    "timesheets",
    "delete-time-off",
  ] as const;
}

export function useDeleteTimeOffMutation(organizationId: OrganizationId) {
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getDeleteTimeOffMutationKey(organizationId),
    mutationFn: async (timeOffId: TimeOffId) =>
      unwrapActionResult(await deleteTimeOff(organizationId, timeOffId)),
    onSuccess: invalidateTimesheets,
  });
}
