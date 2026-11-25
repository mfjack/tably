import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { startCardTerminalCharge } from "../actions";
import type { StartCardTerminalChargeInput } from "../schemas";

export function getStartCardTerminalChargeMutationKey(
  organizationId: OrganizationId,
) {
  return ["card-terminal", organizationId, "start-charge"] as const;
}

export function useStartCardTerminalChargeMutation(
  organizationId: OrganizationId,
) {
  return useMutation({
    mutationKey: getStartCardTerminalChargeMutationKey(organizationId),
    mutationFn: async (input: StartCardTerminalChargeInput) =>
      unwrapActionResult(await startCardTerminalCharge(organizationId, input)),
  });
}
