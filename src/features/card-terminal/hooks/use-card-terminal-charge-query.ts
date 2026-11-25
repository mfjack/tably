import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { fetchCardTerminalCharge } from "../actions";
import type { CardTerminalChargeId } from "../types";

const POLLING_INTERVAL_MS = 2500;

export function getCardTerminalChargeQueryKey(
  organizationId: OrganizationId,
  chargeId: CardTerminalChargeId | null,
) {
  return ["card-terminal", organizationId, "charge", chargeId] as const;
}

export function useCardTerminalChargeQuery(
  organizationId: OrganizationId,
  chargeId: CardTerminalChargeId | null,
) {
  return useQuery({
    queryKey: getCardTerminalChargeQueryKey(organizationId, chargeId),
    queryFn: async () =>
      chargeId
        ? unwrapActionResult(
            await fetchCardTerminalCharge(organizationId, chargeId),
          )
        : null,
    enabled: chargeId !== null,
    gcTime: 0,
    retry: true,
    refetchIntervalInBackground: true,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" || !query.state.data
        ? POLLING_INTERVAL_MS
        : false,
  });
}
