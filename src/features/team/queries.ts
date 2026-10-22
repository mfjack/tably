import "server-only";

import { cache } from "react";
import type { UserId } from "@/features/auth/types";
import type { OrganizationId } from "@/features/organizations/types";
import { createClient } from "@/lib/supabase/server";
import type {
  InvitationPreview,
  InvitationStatus,
  TeamMemberSummary,
} from "./types";

const INVITATION_STATUSES: readonly InvitationStatus[] = [
  "pending",
  "expired",
  "accepted",
];

function toInvitationStatus(value: string): InvitationStatus {
  return INVITATION_STATUSES.find((status) => status === value) ?? "expired";
}

export async function getInvitationPreview(
  token: string,
): Promise<InvitationPreview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_invitation", { p_token: token })
    .maybeSingle();

  if (error || !data) return null;
  return {
    organizationName: data.organization_name,
    inviteeName: data.invitee_name,
    status: toInvitationStatus(data.status),
  };
}

export const listTeamMemberSummaries = cache(
  async (organizationId: OrganizationId): Promise<TeamMemberSummary[]> => {
    const supabase = await createClient();
    const { data: memberships, error } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("organization_id", organizationId);
    if (error) throw error;

    const userIds = memberships.map((membership) => membership.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    if (profilesError) throw profilesError;

    return profiles
      .map((profile) => ({
        userId: profile.id as UserId,
        name: profile.full_name ?? "Sem nome",
      }))
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  },
);
