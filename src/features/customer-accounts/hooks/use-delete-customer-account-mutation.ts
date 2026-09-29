import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteCustomerAccount } from "../actions";
import type { CustomerAccountId } from "../types";
import { useInvalidateCustomerAccounts } from "./use-invalidate-customer-accounts";

export function getDeleteCustomerAccountMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "customer-accounts",
    "delete",
  ] as const;
}

export function useDeleteCustomerAccountMutation(
  organizationId: OrganizationId,
) {
  const invalidateCustomerAccounts =
    useInvalidateCustomerAccounts(organizationId);

  return useMutation({
    mutationKey: getDeleteCustomerAccountMutationKey(organizationId),
    mutationFn: async (accountId: CustomerAccountId) =>
      unwrapActionResult(await deleteCustomerAccount(accountId)),
    onSuccess: invalidateCustomerAccounts,
  });
}
