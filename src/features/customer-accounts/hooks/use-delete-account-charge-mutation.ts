import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteAccountCharge } from "../actions";
import type { AccountEntryId } from "../types";
import { useInvalidateCustomerAccounts } from "./use-invalidate-customer-accounts";

export function getDeleteAccountChargeMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "customer-accounts",
    "delete-charge",
  ] as const;
}

export function useDeleteAccountChargeMutation(organizationId: OrganizationId) {
  const invalidateCustomerAccounts =
    useInvalidateCustomerAccounts(organizationId);

  return useMutation({
    mutationKey: getDeleteAccountChargeMutationKey(organizationId),
    mutationFn: async (entryId: AccountEntryId) =>
      unwrapActionResult(await deleteAccountCharge(entryId)),
    onSuccess: invalidateCustomerAccounts,
  });
}
