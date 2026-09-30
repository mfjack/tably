import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateTimesheets } from "@/features/time-clock/hooks/use-invalidate-timesheets";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteHoliday } from "../actions";
import type { HolidayId } from "../types";
import { useInvalidateHolidays } from "./use-invalidate-holidays";

export function getDeleteHolidayMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "holidays", "delete"] as const;
}

export function useDeleteHolidayMutation(organizationId: OrganizationId) {
  const invalidateHolidays = useInvalidateHolidays(organizationId);
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getDeleteHolidayMutationKey(organizationId),
    mutationFn: async (holidayId: HolidayId) =>
      unwrapActionResult(await deleteHoliday(organizationId, holidayId)),
    onSuccess: () =>
      Promise.all([invalidateHolidays(), invalidateTimesheets()]),
  });
}
