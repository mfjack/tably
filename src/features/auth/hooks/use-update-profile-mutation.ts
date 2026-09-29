import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { updateProfile } from "../actions";
import type { ProfileInput } from "../schemas";

export function getUpdateProfileMutationKey() {
  return ["profile", "update"] as const;
}

export function useUpdateProfileMutation() {
  return useMutation({
    mutationKey: getUpdateProfileMutationKey(),
    mutationFn: async (input: ProfileInput) =>
      unwrapActionResult(await updateProfile(input)),
  });
}
