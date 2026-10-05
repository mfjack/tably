import { useMutation } from "@tanstack/react-query";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { addDayPunches } from "../actions";
import type { DayPunchesInput } from "../schemas";
import { useInvalidateTimesheets } from "./use-invalidate-timesheets";

export function getAddDayPunchesMutationKey(organizationId: OrganizationId) {
  return [
    "organizations",
    organizationId,
    "timesheets",
    "add-day-punches",
  ] as const;
}

export function useAddDayPunchesMutation(organizationId: OrganizationId) {
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getAddDayPunchesMutationKey(organizationId),
    mutationFn: async ({
      employeeId,
      input,
    }: {
      employeeId: EmployeeId;
      input: DayPunchesInput;
    }) =>
      unwrapActionResult(
        await addDayPunches(organizationId, employeeId, input),
      ),
    onSuccess: invalidateTimesheets,
  });
}
