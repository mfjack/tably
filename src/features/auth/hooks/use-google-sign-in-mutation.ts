import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { getGoogleSignInUrl } from "../actions";

export function getGoogleSignInMutationKey() {
  return ["auth", "google-sign-in"] as const;
}

export function useGoogleSignInMutation() {
  return useMutation({
    mutationKey: getGoogleSignInMutationKey(),
    mutationFn: async (nextPath?: string) =>
      unwrapActionResult(await getGoogleSignInUrl(nextPath)),
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
  });
}
