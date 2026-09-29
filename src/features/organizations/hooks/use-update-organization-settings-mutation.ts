import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { updateOrganizationSettings } from "../actions";
import type { OrganizationSettingsInput } from "../schemas";
import type { OrganizationId } from "../types";

export function getUpdateOrganizationSettingsMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "update-settings"] as const;
}

export function useUpdateOrganizationSettingsMutation(
  organizationId: OrganizationId,
) {
  return useMutation({
    mutationKey: getUpdateOrganizationSettingsMutationKey(organizationId),
    mutationFn: async (input: OrganizationSettingsInput) =>
      unwrapActionResult(
        await updateOrganizationSettings(organizationId, input),
      ),
  });
}
