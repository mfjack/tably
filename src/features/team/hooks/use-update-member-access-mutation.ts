import { useMutation } from "@tanstack/react-query";
import type { UserId } from "@/features/auth/types";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { updateMemberAccess } from "../actions";
import type { MemberAccessInput } from "../schemas";
import { useInvalidateTeam } from "./use-invalidate-team";

type UpdateMemberAccessVariables = {
  userId: UserId;
  input: MemberAccessInput;
};

export function getUpdateMemberAccessMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "team", "update-access"] as const;
}

export function useUpdateMemberAccessMutation(organizationId: OrganizationId) {
  const invalidateTeam = useInvalidateTeam(organizationId);

  return useMutation({
    mutationKey: getUpdateMemberAccessMutationKey(organizationId),
    mutationFn: async ({ userId, input }: UpdateMemberAccessVariables) =>
      unwrapActionResult(
        await updateMemberAccess(organizationId, userId, input),
      ),
    onSuccess: invalidateTeam,
  });
}
