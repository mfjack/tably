import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { resetPassword } from "../actions";
import type { ResetPasswordInput } from "../schemas";

export function getResetPasswordMutationKey() {
  return ["auth", "reset-password"] as const;
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationKey: getResetPasswordMutationKey(),
    mutationFn: async (values: ResetPasswordInput) =>
      unwrapActionResult(await resetPassword(values)),
  });
}
