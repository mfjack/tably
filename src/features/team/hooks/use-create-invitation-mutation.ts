import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { createInvitation } from "../actions";
import type { InvitationInput } from "../schemas";
import { useInvalidateTeam } from "./use-invalidate-team";

export function getCreateInvitationMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "team", "invite"] as const;
}

export function useCreateInvitationMutation(organizationId: OrganizationId) {
  const invalidateTeam = useInvalidateTeam(organizationId);

  return useMutation({
    mutationKey: getCreateInvitationMutationKey(organizationId),
    mutationFn: async (input: InvitationInput) =>
      unwrapActionResult(await createInvitation(organizationId, input)),
    onSuccess: invalidateTeam,
  });
}
