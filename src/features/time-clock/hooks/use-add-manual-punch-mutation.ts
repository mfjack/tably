import { useMutation } from "@tanstack/react-query";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { addManualPunch } from "../actions";
import type { ManualPunchInput } from "../schemas";

import { useInvalidateTimesheets } from "./use-invalidate-timesheets";

export function getAddManualPunchMutationKey(organizationId: OrganizationId) {
  return [
    "organizations",
    organizationId,
    "timesheets",
    "add-manual-punch",
  ] as const;
}

export function useAddManualPunchMutation(organizationId: OrganizationId) {
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getAddManualPunchMutationKey(organizationId),
    mutationFn: async ({
      employeeId,
      input,
    }: {
      employeeId: EmployeeId;
      input: ManualPunchInput;
    }) =>
      unwrapActionResult(
        await addManualPunch(organizationId, employeeId, input),
      ),
    onSuccess: invalidateTimesheets,
  });
}
