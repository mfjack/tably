import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { updateOpeningHours } from "../actions";
import type { OpeningHoursFormInput } from "../schemas";
import type { OrganizationId } from "../types";

export function getUpdateOpeningHoursMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "update-opening-hours"] as const;
}

export function useUpdateOpeningHoursMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getUpdateOpeningHoursMutationKey(organizationId),
    mutationFn: async (input: OpeningHoursFormInput) =>
      unwrapActionResult(await updateOpeningHours(organizationId, input)),
  });
}
