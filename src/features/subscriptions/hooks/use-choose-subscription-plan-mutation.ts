import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { chooseSubscriptionPlan } from "../actions";
import type { SubscriptionPlan } from "../plans";

export function getChooseSubscriptionPlanMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "subscription", "plan"] as const;
}

export function useChooseSubscriptionPlanMutation(
  organizationId: OrganizationId,
) {
  const router = useRouter();

  return useMutation({
    mutationKey: getChooseSubscriptionPlanMutationKey(organizationId),
    mutationFn: async (plan: SubscriptionPlan) =>
      unwrapActionResult(await chooseSubscriptionPlan(organizationId, plan)),
    networkMode: "online",
    onSuccess: () => router.refresh(),
  });
}
