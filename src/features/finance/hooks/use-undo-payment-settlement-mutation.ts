import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import type { PaymentSettlementKey } from "../receivables";
import { undoPaymentSettlement } from "../receivables-actions";
import { useInvalidateFinance } from "./use-invalidate-finance";

export function getUndoPaymentSettlementMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "receivables",
    "undo",
  ] as const;
}

export function useUndoPaymentSettlementMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getUndoPaymentSettlementMutationKey(organizationId),
    mutationFn: async (key: PaymentSettlementKey) =>
      unwrapActionResult(await undoPaymentSettlement(organizationId, key)),
    onSuccess: invalidateFinance,
  });
}
