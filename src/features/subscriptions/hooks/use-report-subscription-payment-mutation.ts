import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { reportSubscriptionPayment } from "../actions";

export function getReportSubscriptionPaymentMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "subscription", "report"] as const;
}

export function useReportSubscriptionPaymentMutation(
  organizationId: OrganizationId,
) {
  const router = useRouter();

  return useMutation({
    mutationKey: getReportSubscriptionPaymentMutationKey(organizationId),
    mutationFn: async () =>
      unwrapActionResult(await reportSubscriptionPayment(organizationId)),
    networkMode: "online",
    onSuccess: () => router.refresh(),
  });
}
