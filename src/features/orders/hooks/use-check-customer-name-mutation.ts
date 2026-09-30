import { onlineManager, useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { isNetworkError } from "@/lib/network-error";
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

async function checkCustomerName(
  organizationId: OrganizationId,
  customerName: string,
): Promise<boolean> {
  if (!onlineManager.isOnline()) return true;

  try {
    return unwrapActionResult(
      await isCustomerNameAvailable(organizationId, customerName),
    );
  } catch (error) {
    if (isNetworkError(error)) return true;
    throw error;
  }
}

export function useCheckCustomerNameMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getCheckCustomerNameMutationKey(organizationId),
    mutationFn: (customerName: string) =>
      checkCustomerName(organizationId, customerName),
    networkMode: "always",
  });
}
