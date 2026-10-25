import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { registerStockLoss } from "../actions";
import type { StockLossFormInput } from "../schemas";
import { useInvalidateStockLosses } from "./use-invalidate-stock-losses";

export function getRegisterStockLossMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "stock-losses", "register"] as const;
}

export function useRegisterStockLossMutation(organizationId: OrganizationId) {
  const invalidateStockLosses = useInvalidateStockLosses(organizationId);

  return useMutation({
    mutationKey: getRegisterStockLossMutationKey(organizationId),
    mutationFn: async (values: StockLossFormInput) =>
      unwrapActionResult(await registerStockLoss(organizationId, values)),
    onSuccess: invalidateStockLosses,
  });
}
