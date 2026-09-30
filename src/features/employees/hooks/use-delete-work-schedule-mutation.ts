import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateTimesheets } from "@/features/time-clock/hooks/use-invalidate-timesheets";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteWorkSchedule } from "../actions";
import type { WorkScheduleId } from "../types";
import { useInvalidateEmployees } from "./use-invalidate-employees";
import { useInvalidateWorkSchedules } from "./use-invalidate-work-schedules";

export function getDeleteWorkScheduleMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "work-schedules", "delete"] as const;
}

export function useDeleteWorkScheduleMutation(organizationId: OrganizationId) {
  const invalidateWorkSchedules = useInvalidateWorkSchedules(organizationId);
  const invalidateEmployees = useInvalidateEmployees(organizationId);
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getDeleteWorkScheduleMutationKey(organizationId),
    mutationFn: async (workScheduleId: WorkScheduleId) =>
      unwrapActionResult(
        await deleteWorkSchedule(organizationId, workScheduleId),
      ),
    onSuccess: () =>
      Promise.all([
        invalidateWorkSchedules(),
        invalidateEmployees(),
        invalidateTimesheets(),
      ]),
  });
}
