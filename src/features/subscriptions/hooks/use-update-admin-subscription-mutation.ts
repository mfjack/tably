import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { updateAdminSubscription } from "../actions";
import type { AdminSubscriptionInput } from "../schemas";

type UpdateAdminSubscriptionVariables = {
  organizationId: OrganizationId;
  input: AdminSubscriptionInput;
};

export function getUpdateAdminSubscriptionMutationKey() {
  return ["admin", "subscriptions", "update"] as const;
}

export function useUpdateAdminSubscriptionMutation() {
  const router = useRouter();

  return useMutation({
    mutationKey: getUpdateAdminSubscriptionMutationKey(),
    mutationFn: async ({
      organizationId,
      input,
    }: UpdateAdminSubscriptionVariables) =>
      unwrapActionResult(await updateAdminSubscription(organizationId, input)),
    networkMode: "online",
    onSuccess: () => router.refresh(),
  });
}
