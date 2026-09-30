import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateTimesheets } from "@/features/time-clock/hooks/use-invalidate-timesheets";
import { unwrapActionResult } from "@/lib/action-result";
import { saveHoliday } from "../actions";
import type { HolidayInput } from "../schemas";
import { useInvalidateHolidays } from "./use-invalidate-holidays";

export function getSaveHolidayMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "holidays", "save"] as const;
}

export function useSaveHolidayMutation(organizationId: OrganizationId) {
  const invalidateHolidays = useInvalidateHolidays(organizationId);
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getSaveHolidayMutationKey(organizationId),
    mutationFn: async (input: HolidayInput) =>
      unwrapActionResult(await saveHoliday(organizationId, input)),
    onSuccess: () =>
      Promise.all([invalidateHolidays(), invalidateTimesheets()]),
  });
}
