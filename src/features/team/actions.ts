"use server";

import type { UserId } from "@/features/auth/types";
import { getUserOrganizationById } from "@/features/organizations/queries";
import type { OrganizationId } from "@/features/organizations/types";
import { getTeamMemberLimit } from "@/features/subscriptions/subscription-state";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { getDatabaseErrorMessage } from "@/lib/database-errors";
import { createClient } from "@/lib/supabase/server";
import { isOrganizationOwner } from "./module-access";
import {
  type InvitationInput,
  invitationSchema,
  type MemberAccessInput,
  memberAccessSchema,
} from "./schemas";
import type { Invitation, InvitationId, Team } from "./types";

const OWNER_ONLY_MESSAGE =
  "Só o dono do estabelecimento pode gerenciar a equipe.";
const INVALID_FORM_MESSAGE = "Confira os campos e tente novamente.";

const INVITATION_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  TB037: "Convite não encontrado. Peça um novo link.",
  TB038: "Esse convite já foi usado. Peça um novo link.",
  TB039: "Esse convite venceu. Peça um novo link.",
  TB040:
    "Essa conta já faz parte desse estabelecimento. Se o convite é para outra pessoa, toque em Entrar com outra conta.",
  TB041: "Pessoa não encontrada na equipe.",
};

function getInvitationStatus(expiresAt: string): Invitation["status"] {
  return new Date(expiresAt) < new Date() ? "expired" : "pending";
}

export async function getTeam(
  organizationId: OrganizationId,
): Promise<ActionResult<Team>> {
  const organization = await getUserOrganizationById(organizationId);
  if (organization?.role !== "owner") return actionFailure(OWNER_ONLY_MESSAGE);

  const supabase = await createClient();
  const [membersResult, invitationsResult] = await Promise.all([
    supabase.rpc("list_organization_members", {
      p_organization_id: organizationId,
    }),
    supabase
      .from("organization_invitations")
      .select(
        "id, invitee_name, token, allowed_modules, can_access_settings, expires_at",
      )
      .eq("organization_id", organizationId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (membersResult.error) {
    return databaseFailure(
      "Não foi possível carregar a equipe.",
      membersResult.error,
    );
  }
  if (invitationsResult.error) {
    return databaseFailure(
      "Não foi possível carregar os convites.",
      invitationsResult.error,
    );
  }

  return actionSuccess({
    maxMembers:
      getTeamMemberLimit(organization.subscription)?.maxMembers ?? null,
    members: membersResult.data.map((member) => ({
      userId: member.user_id as UserId,
      name: member.full_name ?? member.email,
      email: member.email,
      isOwner: member.role === "owner",
      allowedModules: member.allowed_modules,
      canAccessSettings: member.can_access_settings,
      joinedAt: member.created_at,
    })),
    invitations: invitationsResult.data.map((invitation) => ({
      id: invitation.id as InvitationId,
      inviteeName: invitation.invitee_name,
      token: invitation.token,
      allowedModules: invitation.allowed_modules,
      canAccessSettings: invitation.can_access_settings,
      expiresAt: invitation.expires_at,
      status: getInvitationStatus(invitation.expires_at),
    })),
  });
}

export async function createInvitation(
  organizationId: OrganizationId,
  input: InvitationInput,
): Promise<ActionResult<{ token: string }>> {
  const team = await getTeam(organizationId);
  if (team.status === "error") return team;

  const parsedInput = invitationSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const { maxMembers, members, invitations } = team.data;
  const usedSeats =
    members.filter((member) => !member.isOwner).length +
    invitations.filter((invitation) => invitation.status === "pending").length;
  if (maxMembers !== null && usedSeats >= maxMembers) {
    return actionFailure(
      `Seu plano permite até ${maxMembers} pessoas na equipe, contando os convites pendentes. Para convidar mais, troque de plano na aba Assinatura.`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_invitations")
    .insert({
      organization_id: organizationId,
      invitee_name: parsedInput.data.inviteeName,
      allowed_modules: parsedInput.data.allowedModules,
      can_access_settings: parsedInput.data.canAccessSettings,
    })
    .select("token")
    .single();

  if (error) return databaseFailure("Não foi possível criar o convite.", error);
  return actionSuccess({ token: data.token });
}

export async function deleteInvitation(
  organizationId: OrganizationId,
  invitationId: InvitationId,
): Promise<ActionResult> {
  if (!(await isOrganizationOwner(organizationId))) {
    return actionFailure(OWNER_ONLY_MESSAGE);
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("organization_id", organizationId);

  if (error)
    return databaseFailure("Não foi possível cancelar o convite.", error);
  return actionSuccess();
}

export async function updateMemberAccess(
  organizationId: OrganizationId,
  userId: UserId,
  input: MemberAccessInput,
): Promise<ActionResult> {
  if (!(await isOrganizationOwner(organizationId))) {
    return actionFailure(OWNER_ONLY_MESSAGE);
  }
  const parsedInput = memberAccessSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member_access", {
    p_organization_id: organizationId,
    p_user_id: userId,
    p_allowed_modules: parsedInput.data.allowedModules,
    p_can_access_settings: parsedInput.data.canAccessSettings,
  });

  if (error) {
    return actionFailure(
      getDatabaseErrorMessage(
        INVITATION_ERROR_MESSAGES,
        error,
        "Não foi possível salvar o acesso.",
      ),
    );
  }
  return actionSuccess();
}

export async function removeMember(
  organizationId: OrganizationId,
  userId: UserId,
): Promise<ActionResult> {
  if (!(await isOrganizationOwner(organizationId))) {
    return actionFailure(OWNER_ONLY_MESSAGE);
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", {
    p_organization_id: organizationId,
    p_user_id: userId,
  });

  if (error) {
    return actionFailure(
      getDatabaseErrorMessage(
        INVITATION_ERROR_MESSAGES,
        error,
        "Não foi possível remover a pessoa.",
      ),
    );
  }
  return actionSuccess();
}

export async function acceptInvitation(
  token: string,
): Promise<ActionResult<{ organizationSlug: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", {
    p_token: token,
  });

  if (error) {
    return actionFailure(
      getDatabaseErrorMessage(
        INVITATION_ERROR_MESSAGES,
        error,
        "Não foi possível aceitar o convite.",
      ),
    );
  }
  return actionSuccess({ organizationSlug: data });
}
