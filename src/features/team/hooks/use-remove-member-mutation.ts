import { useMutation } from "@tanstack/react-query";
import type { UserId } from "@/features/auth/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { removeMember } from "../actions";
import { useInvalidateTeam } from "./use-invalidate-team";

export function getRemoveMemberMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "team", "remove-member"] as const;
}

export function useRemoveMemberMutation(organizationId: OrganizationId) {
  const invalidateTeam = useInvalidateTeam(organizationId);

  return useMutation({
    mutationKey: getRemoveMemberMutationKey(organizationId),
    mutationFn: async (userId: UserId) =>
      unwrapActionResult(await removeMember(organizationId, userId)),
    onSuccess: invalidateTeam,
  });
}
