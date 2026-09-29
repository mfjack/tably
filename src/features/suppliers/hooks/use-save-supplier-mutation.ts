import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveSupplier } from "../actions";
import type { SupplierInput } from "../schemas";
import type { SupplierId } from "../types";
import { useInvalidateSuppliers } from "./use-invalidate-suppliers";

type SaveSupplierVariables = {
  supplierId: SupplierId | null;
  input: SupplierInput;
};

export function getSaveSupplierMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "suppliers", "save"] as const;
}

export function useSaveSupplierMutation(organizationId: OrganizationId) {
  const invalidateSuppliers = useInvalidateSuppliers(organizationId);

  return useMutation({
    mutationKey: getSaveSupplierMutationKey(organizationId),
    mutationFn: async ({ supplierId, input }: SaveSupplierVariables) =>
      unwrapActionResult(await saveSupplier(organizationId, supplierId, input)),
    onSuccess: invalidateSuppliers,
  });
}
