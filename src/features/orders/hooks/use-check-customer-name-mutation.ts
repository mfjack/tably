import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { isCustomerNameAvailable } from "../actions";

export function getCheckCustomerNameMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "orders",
    "check-customer-name",
  ] as const;
}

export function useCheckCustomerNameMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getCheckCustomerNameMutationKey(organizationId),
    mutationFn: async (customerName: string) =>
      unwrapActionResult(
        await isCustomerNameAvailable(organizationId, customerName),
      ),
  });
}
