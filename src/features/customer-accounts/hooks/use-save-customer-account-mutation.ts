import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { saveCustomerAccount } from "../actions";
import type { CustomerAccountInput } from "../schemas";
import type { CustomerAccountId } from "../types";
import { useInvalidateCustomerAccounts } from "./use-invalidate-customer-accounts";

type SaveCustomerAccountVariables = {
  accountId: CustomerAccountId | null;
  input: CustomerAccountInput;
};

export function getSaveCustomerAccountMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "customer-accounts",
    "save",
  ] as const;
}

export function useSaveCustomerAccountMutation(organizationId: OrganizationId) {
  const invalidateCustomerAccounts =
    useInvalidateCustomerAccounts(organizationId);

  return useMutation({
    mutationKey: getSaveCustomerAccountMutationKey(organizationId),
    mutationFn: async ({ accountId, input }: SaveCustomerAccountVariables) =>
      unwrapActionResult(
        await saveCustomerAccount(organizationId, accountId, input),
      ),
    onSuccess: invalidateCustomerAccounts,
  });
}
