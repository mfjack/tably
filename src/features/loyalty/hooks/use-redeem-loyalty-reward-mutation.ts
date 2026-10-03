import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { redeemLoyaltyReward } from "../actions";
import type { LoyaltyCustomerId } from "../types";
import { useInvalidateLoyalty } from "./use-invalidate-loyalty";

export function getRedeemLoyaltyRewardMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "loyalty-customers",
    "redeem",
  ] as const;
}

export function useRedeemLoyaltyRewardMutation(organizationId: OrganizationId) {
  const invalidateLoyalty = useInvalidateLoyalty(organizationId);

  return useMutation({
    mutationKey: getRedeemLoyaltyRewardMutationKey(organizationId),
    mutationFn: async (customerId: LoyaltyCustomerId) =>
      unwrapActionResult(await redeemLoyaltyReward(organizationId, customerId)),
    onSuccess: invalidateLoyalty,
  });
}
