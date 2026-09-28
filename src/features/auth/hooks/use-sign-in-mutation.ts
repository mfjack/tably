import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { signIn } from "../actions";
import type { SignInInput } from "../schemas";

export function getSignInMutationKey() {
  return ["auth", "sign-in"] as const;
}

export function useSignInMutation() {
  return useMutation({
    mutationKey: getSignInMutationKey(),
    mutationFn: async (values: SignInInput) =>
      unwrapActionResult(await signIn(values)),
  });
}
