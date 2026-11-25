import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { cancelCardTerminalCharge } from "../actions";
import type { CardTerminalChargeId } from "../types";

export function getCancelCardTerminalChargeMutationKey(
  organizationId: OrganizationId,
) {
  return ["card-terminal", organizationId, "cancel-charge"] as const;
}

export function useCancelCardTerminalChargeMutation(
  organizationId: OrganizationId,
) {
  return useMutation({
    mutationKey: getCancelCardTerminalChargeMutationKey(organizationId),
    mutationFn: async (chargeId: CardTerminalChargeId) =>
      unwrapActionResult(
        await cancelCardTerminalCharge(organizationId, chargeId),
      ),
  });
}
