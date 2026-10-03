import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveLoyaltySettings } from "../actions";
import type { LoyaltySettingsInput } from "../schemas";

export function getSaveLoyaltySettingsMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "loyalty-settings", "save"] as const;
}

export function useSaveLoyaltySettingsMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getSaveLoyaltySettingsMutationKey(organizationId),
    mutationFn: async (input: LoyaltySettingsInput) =>
      unwrapActionResult(await saveLoyaltySettings(organizationId, input)),
  });
}
