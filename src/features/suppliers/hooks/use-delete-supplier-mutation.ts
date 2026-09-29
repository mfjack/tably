import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteSupplier } from "../actions";
import type { SupplierId } from "../types";
import { useInvalidateSuppliers } from "./use-invalidate-suppliers";

export function getDeleteSupplierMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "suppliers", "delete"] as const;
}

export function useDeleteSupplierMutation(organizationId: OrganizationId) {
  const invalidateSuppliers = useInvalidateSuppliers(organizationId);

  return useMutation({
    mutationKey: getDeleteSupplierMutationKey(organizationId),
    mutationFn: async (supplierId: SupplierId) =>
      unwrapActionResult(await deleteSupplier(organizationId, supplierId)),
    onSuccess: invalidateSuppliers,
  });
}
