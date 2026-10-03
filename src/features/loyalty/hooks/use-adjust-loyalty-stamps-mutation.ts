import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { adjustLoyaltyStamps } from "../actions";
import type { LoyaltyAdjustmentInput } from "../schemas";
import type { LoyaltyCustomerId } from "../types";
import { useInvalidateLoyalty } from "./use-invalidate-loyalty";

type AdjustLoyaltyStampsVariables = {
  customerId: LoyaltyCustomerId;
  input: LoyaltyAdjustmentInput;
};

export function getAdjustLoyaltyStampsMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "loyalty-customers",
    "adjust",
  ] as const;
}

export function useAdjustLoyaltyStampsMutation(organizationId: OrganizationId) {
  const invalidateLoyalty = useInvalidateLoyalty(organizationId);

  return useMutation({
    mutationKey: getAdjustLoyaltyStampsMutationKey(organizationId),
    mutationFn: async ({ customerId, input }: AdjustLoyaltyStampsVariables) =>
      unwrapActionResult(
        await adjustLoyaltyStamps(organizationId, customerId, input),
      ),
    onSuccess: invalidateLoyalty,
  });
}
