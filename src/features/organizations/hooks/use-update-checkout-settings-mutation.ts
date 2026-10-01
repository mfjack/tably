import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { updateCheckoutSettings } from "../actions";
import type { CheckoutSettingsInput } from "../schemas";
import type { OrganizationId } from "../types";

export function getUpdateCheckoutSettingsMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "update-checkout-settings"] as const;
}

export function useUpdateCheckoutSettingsMutation(
  organizationId: OrganizationId,
) {
  return useMutation({
    mutationKey: getUpdateCheckoutSettingsMutationKey(organizationId),
    mutationFn: async (input: CheckoutSettingsInput) =>
      unwrapActionResult(await updateCheckoutSettings(organizationId, input)),
  });
}
