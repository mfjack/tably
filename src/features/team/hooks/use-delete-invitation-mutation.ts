import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteInvitation } from "../actions";
import type { InvitationId } from "../types";
import { useInvalidateTeam } from "./use-invalidate-team";

export function getDeleteInvitationMutationKey(organizationId: OrganizationId) {
  return [
    "organizations",
    organizationId,
    "team",
    "delete-invitation",
  ] as const;
}

export function useDeleteInvitationMutation(organizationId: OrganizationId) {
  const invalidateTeam = useInvalidateTeam(organizationId);

  return useMutation({
    mutationKey: getDeleteInvitationMutationKey(organizationId),
    mutationFn: async (invitationId: InvitationId) =>
      unwrapActionResult(await deleteInvitation(organizationId, invitationId)),
    onSuccess: invalidateTeam,
  });
}
