import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { updateStockLoss } from "../actions";
import type { StockLossFormInput } from "../schemas";
import type { StockLossId } from "../types";
import { useInvalidateStockLosses } from "./use-invalidate-stock-losses";

type UpdateStockLossVariables = {
  lossId: StockLossId;
  values: StockLossFormInput;
};

export function getUpdateStockLossMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "stock-losses", "update"] as const;
}

export function useUpdateStockLossMutation(organizationId: OrganizationId) {
  const invalidateStockLosses = useInvalidateStockLosses(organizationId);

  return useMutation({
    mutationKey: getUpdateStockLossMutationKey(organizationId),
    mutationFn: async ({ lossId, values }: UpdateStockLossVariables) =>
      unwrapActionResult(await updateStockLoss(organizationId, lossId, values)),
    onSuccess: invalidateStockLosses,
  });
}
