import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { recordSubscriptionPayment } from "../actions";
import type { SubscriptionPaymentInput } from "../schemas";

type RecordSubscriptionPaymentVariables = {
  organizationId: OrganizationId;
  input: SubscriptionPaymentInput;
};

export function getRecordSubscriptionPaymentMutationKey() {
  return ["admin", "subscriptions", "payment"] as const;
}

export function useRecordSubscriptionPaymentMutation() {
  const router = useRouter();

  return useMutation({
    mutationKey: getRecordSubscriptionPaymentMutationKey(),
    mutationFn: async ({
      organizationId,
      input,
    }: RecordSubscriptionPaymentVariables) =>
      unwrapActionResult(
        await recordSubscriptionPayment(organizationId, input),
      ),
    networkMode: "online",
    onSuccess: () => router.refresh(),
  });
}
