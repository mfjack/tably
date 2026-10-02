import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { chooseBillingCycle } from "../actions";
import type { BillingCycle } from "../plans";

export function getChooseBillingCycleMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "subscription", "cycle"] as const;
}

export function useChooseBillingCycleMutation(organizationId: OrganizationId) {
  const router = useRouter();

  return useMutation({
    mutationKey: getChooseBillingCycleMutationKey(organizationId),
    mutationFn: async (billingCycle: BillingCycle) =>
      unwrapActionResult(
        await chooseBillingCycle(organizationId, billingCycle),
      ),
    networkMode: "online",
    onSuccess: () => router.refresh(),
  });
}
