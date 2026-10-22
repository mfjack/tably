import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { acceptInvitation } from "../actions";

export function getAcceptInvitationMutationKey(token: string) {
  return ["invitations", token, "accept"] as const;
}

export function useAcceptInvitationMutation(token: string) {
  return useMutation({
    mutationKey: getAcceptInvitationMutationKey(token),
    mutationFn: async () => unwrapActionResult(await acceptInvitation(token)),
  });
}
