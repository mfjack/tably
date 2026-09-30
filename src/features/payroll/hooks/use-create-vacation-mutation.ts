import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { useInvalidateTimesheets } from "@/features/time-clock/hooks/use-invalidate-timesheets";
import { unwrapActionResult } from "@/lib/action-result";
import { createVacation } from "../extra-actions";
import type { VacationInput } from "../schemas";
import { useInvalidatePayroll } from "./use-invalidate-payroll";

export function getCreateVacationMutationKey(organizationId: OrganizationId) {
  return [
    "organizations",
    organizationId,
    "payroll",
    "vacations",
    "create",
  ] as const;
}

export function useCreateVacationMutation(organizationId: OrganizationId) {
  const invalidatePayroll = useInvalidatePayroll(organizationId);
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getCreateVacationMutationKey(organizationId),
    mutationFn: async (input: VacationInput) =>
      unwrapActionResult(await createVacation(organizationId, input)),
    onSuccess: () => Promise.all([invalidatePayroll(), invalidateTimesheets()]),
  });
}
