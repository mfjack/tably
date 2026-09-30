import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateTimesheets } from "@/features/time-clock/hooks/use-invalidate-timesheets";
import { unwrapActionResult } from "@/lib/action-result";
import { saveWorkSchedule } from "../actions";
import type { WorkScheduleInput } from "../schemas";
import type { WorkScheduleId } from "../types";
import { useInvalidateWorkSchedules } from "./use-invalidate-work-schedules";

export function getSaveWorkScheduleMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "work-schedules", "save"] as const;
}

export function useSaveWorkScheduleMutation(organizationId: OrganizationId) {
  const invalidateWorkSchedules = useInvalidateWorkSchedules(organizationId);
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getSaveWorkScheduleMutationKey(organizationId),
    mutationFn: async ({
      workScheduleId,
      input,
    }: {
      workScheduleId: WorkScheduleId | null;
      input: WorkScheduleInput;
    }) =>
      unwrapActionResult(
        await saveWorkSchedule(organizationId, workScheduleId, input),
      ),
    onSuccess: () =>
      Promise.all([invalidateWorkSchedules(), invalidateTimesheets()]),
  });
}
