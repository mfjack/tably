import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { generateThirteenth } from "../extra-actions";
import type { ThirteenthInstallment } from "../schemas";
import { useInvalidatePayroll } from "./use-invalidate-payroll";

type GenerateThirteenthVariables = {
  year: number;
  installment: ThirteenthInstallment;
};

export function getGenerateThirteenthMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "payroll",
    "thirteenth",
    "generate",
  ] as const;
}

export function useGenerateThirteenthMutation(organizationId: OrganizationId) {
  const invalidatePayroll = useInvalidatePayroll(organizationId);

  return useMutation({
    mutationKey: getGenerateThirteenthMutationKey(organizationId),
    mutationFn: async ({ year, installment }: GenerateThirteenthVariables) =>
      unwrapActionResult(
        await generateThirteenth(organizationId, year, installment),
      ),
    onSuccess: invalidatePayroll,
  });
}
