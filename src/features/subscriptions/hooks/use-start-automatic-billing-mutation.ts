import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { startAutomaticBilling } from "../automatic-billing-actions";
import type { AutomaticBillingInput } from "../automatic-billing-schemas";

export function getStartAutomaticBillingMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "subscription",
    "automatic-billing",
  ] as const;
}

export function useStartAutomaticBillingMutation(
  organizationId: OrganizationId,
) {
  const router = useRouter();

  return useMutation({
    mutationKey: getStartAutomaticBillingMutationKey(organizationId),
    mutationFn: async (input: AutomaticBillingInput) =>
      unwrapActionResult(await startAutomaticBilling(organizationId, input)),
    networkMode: "online",
    onSuccess: () => router.refresh(),
  });
}
