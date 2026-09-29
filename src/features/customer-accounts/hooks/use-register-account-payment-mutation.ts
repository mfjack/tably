import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { registerAccountPayment } from "../actions";
import type { AccountPaymentInput } from "../schemas";
import type { CustomerAccountId } from "../types";
import { useInvalidateCustomerAccounts } from "./use-invalidate-customer-accounts";

type RegisterAccountPaymentVariables = {
  accountId: CustomerAccountId;
  balance: number;
  input: AccountPaymentInput;
};

export function getRegisterAccountPaymentMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "customer-accounts",
    "register-payment",
  ] as const;
}

export function useRegisterAccountPaymentMutation(
  organizationId: OrganizationId,
) {
  const invalidateCustomerAccounts =
    useInvalidateCustomerAccounts(organizationId);

  return useMutation({
    mutationKey: getRegisterAccountPaymentMutationKey(organizationId),
    mutationFn: async ({
      accountId,
      balance,
      input,
    }: RegisterAccountPaymentVariables) =>
      unwrapActionResult(
        await registerAccountPayment(accountId, balance, input),
      ),
    onSuccess: invalidateCustomerAccounts,
  });
}
