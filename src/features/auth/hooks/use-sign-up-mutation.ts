import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { signUp } from "../actions";
import type { SignUpInput } from "../schemas";

export function getSignUpMutationKey() {
  return ["auth", "sign-up"] as const;
}

export function useSignUpMutation() {
  return useMutation({
    mutationKey: getSignUpMutationKey(),
    mutationFn: async (values: SignUpInput) =>
      unwrapActionResult(await signUp(values)),
  });
}
