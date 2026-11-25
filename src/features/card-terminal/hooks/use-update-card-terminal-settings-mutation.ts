import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { updateCardTerminalSettings } from "../actions";
import type { CardTerminalSettingsInput } from "../schemas";

export function getUpdateCardTerminalSettingsMutationKey(
  organizationId: OrganizationId,
) {
  return ["card-terminal", organizationId, "update-settings"] as const;
}

export function useUpdateCardTerminalSettingsMutation(
  organizationId: OrganizationId,
) {
  return useMutation({
    mutationKey: getUpdateCardTerminalSettingsMutationKey(organizationId),
    mutationFn: async (input: CardTerminalSettingsInput) =>
      unwrapActionResult(
        await updateCardTerminalSettings(organizationId, input),
      ),
  });
}
