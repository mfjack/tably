import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { createLoyaltyCustomer } from "../actions";
import type { LoyaltyCustomerInput } from "../schemas";
import { useInvalidateLoyalty } from "./use-invalidate-loyalty";

export function getCreateLoyaltyCustomerMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "loyalty-customers",
    "create",
  ] as const;
}

export function useCreateLoyaltyCustomerMutation(
  organizationId: OrganizationId,
) {
  const invalidateLoyalty = useInvalidateLoyalty(organizationId);

  return useMutation({
    mutationKey: getCreateLoyaltyCustomerMutationKey(organizationId),
    mutationFn: async (input: LoyaltyCustomerInput) =>
      unwrapActionResult(await createLoyaltyCustomer(organizationId, input)),
    onSuccess: invalidateLoyalty,
  });
}
