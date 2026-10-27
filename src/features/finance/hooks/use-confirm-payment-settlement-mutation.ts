import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import type { PaymentSettlementInput } from "../receivables";
import { confirmPaymentSettlement } from "../receivables-actions";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getConfirmPaymentSettlementMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "receivables",
    "confirm",
  ] as const;
}

export function useConfirmPaymentSettlementMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getConfirmPaymentSettlementMutationKey(organizationId),
    mutationFn: async (input: PaymentSettlementInput) =>
      unwrapActionResult(await confirmPaymentSettlement(organizationId, input)),
    onSuccess: invalidateFinance,
  });
}
