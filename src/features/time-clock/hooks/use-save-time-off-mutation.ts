import { useMutation } from "@tanstack/react-query";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveTimeOff } from "../actions";
import type { TimeOffInput } from "../schemas";

import { useInvalidateTimesheets } from "./use-invalidate-timesheets";

export function getSaveTimeOffMutationKey(organizationId: OrganizationId) {
  return [
    "organizations",
    organizationId,
    "timesheets",
    "save-time-off",
  ] as const;
}

export function useSaveTimeOffMutation(organizationId: OrganizationId) {
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getSaveTimeOffMutationKey(organizationId),
    mutationFn: async ({
      employeeId,
      input,
    }: {
      employeeId: EmployeeId;
      input: TimeOffInput;
    }) =>
      unwrapActionResult(await saveTimeOff(organizationId, employeeId, input)),
    onSuccess: invalidateTimesheets,
  });
}
