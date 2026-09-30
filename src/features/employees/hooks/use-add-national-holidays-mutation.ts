import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateTimesheets } from "@/features/time-clock/hooks/use-invalidate-timesheets";
import { unwrapActionResult } from "@/lib/action-result";
import { addNationalHolidays } from "../actions";
import { useInvalidateHolidays } from "./use-invalidate-holidays";

export function getAddNationalHolidaysMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "holidays", "add-national"] as const;
}

export function useAddNationalHolidaysMutation(organizationId: OrganizationId) {
  const invalidateHolidays = useInvalidateHolidays(organizationId);
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getAddNationalHolidaysMutationKey(organizationId),
    mutationFn: async (year: number) =>
      unwrapActionResult(await addNationalHolidays(organizationId, year)),
    onSuccess: () =>
      Promise.all([invalidateHolidays(), invalidateTimesheets()]),
  });
}
