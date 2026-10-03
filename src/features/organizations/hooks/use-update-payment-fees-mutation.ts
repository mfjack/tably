import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { updatePaymentFees } from "../actions";
import type { PaymentFeesInput } from "../schemas";
import type { OrganizationId } from "../types";

export function getUpdatePaymentFeesMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "update-payment-fees"] as const;
}

export function useUpdatePaymentFeesMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getUpdatePaymentFeesMutationKey(organizationId),
    mutationFn: async (input: PaymentFeesInput) =>
      unwrapActionResult(await updatePaymentFees(organizationId, input)),
  });
}
