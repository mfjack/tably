"use client";

import { format } from "date-fns";
import { Pencil, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTableRowActionButton } from "@/components/data-table/data-table-row-action-button";
import { ConfirmDialog } from "@/components/dialog/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_MODULES, SETTINGS_PAGE } from "@/features/modules/app-modules";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { useDeleteInvitationMutation } from "@/features/team/hooks/use-delete-invitation-mutation";
import { useRemoveMemberMutation } from "@/features/team/hooks/use-remove-member-mutation";
import { useTeamQuery } from "@/features/team/hooks/use-team-query";
import type { TeamMember } from "@/features/team/types";
import {
  type CreatedInvitation,
  InvitationLinkDialog,
} from "./invitation-link-dialog";
import { InvitationShareActions } from "./invitation-share-actions";
import {
  TeamAccessDialog,
  type TeamAccessDialogState,
} from "./team-access-dialog";

const CARD_CLASS_NAME =
  "flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs";

type TeamSettingsProps = {
  organizationId: OrganizationId;
  organizationName: string;
  visibleModuleIds: readonly AppModuleId[];
};

function getPageLabels(
  allowedModules: readonly AppModuleId[] | null,
  canAccessSettings: boolean,
): string[] {
  if (allowedModules === null) return ["Todas as páginas"];
  return [
    ...APP_MODULES.filter((appModule) =>
      allowedModules.includes(appModule.id),
    ).map((appModule) => appModule.label),
    ...(canAccessSettings ? [SETTINGS_PAGE.label] : []),
  ];
}

function PageBadges({
  allowedModules,
  canAccessSettings,
}: {
  allowedModules: readonly AppModuleId[] | null;
  canAccessSettings: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {getPageLabels(allowedModules, canAccessSettings).map((pageLabel) => (
        <Badge key={pageLabel} variant="outline">
          {pageLabel}
        </Badge>
      ))}
    </div>
  );
}

export function TeamSettings({
  organizationId,
  organizationName,
  visibleModuleIds,
}: TeamSettingsProps) {
  const teamQuery = useTeamQuery(organizationId);
  const removeMemberMutation = useRemoveMemberMutation(organizationId);
  const deleteInvitationMutation = useDeleteInvitationMutation(organizationId);
  const [dialogState, setDialogState] = useState<TeamAccessDialogState>({
    mode: "closed",
  });
  const [createdInvitation, setCreatedInvitation] =
    useState<CreatedInvitation | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const team = teamQuery.data;
  const usedSeats = team
    ? team.members.filter((member) => !member.isOwner).length +
      team.invitations.filter((invitation) => invitation.status === "pending")
        .length
    : 0;
  const hasReachedLimit =
    team?.maxMembers !== null &&
    team?.maxMembers !== undefined &&
    usedSeats >= team.maxMembers;

  function confirmRemoveMember() {
    if (!memberToRemove) return;
    removeMemberMutation.mutate(memberToRemove.userId, {
      onSuccess: () => {
        toast.success(`${memberToRemove.name} não tem mais acesso.`);
        setMemberToRemove(null);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg">Equipe</h2>
        <p className="text-muted-foreground text-sm">
          Convide quem precisa acessar o sistema, como gerente, caixa ou
          contador. Cada pessoa entra com a própria conta e vê só as páginas que
          você liberar. Ninguém precisa da sua senha.
        </p>
      </header>

      {teamQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>{teamQuery.error.message}</AlertDescription>
        </Alert>
      ) : !team ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {team.members.map((member) => (
              <li key={member.userId} className={CARD_CLASS_NAME}>
                <div className="flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold text-base">
                      {member.name}
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
                      {member.email}
                    </span>
                  </div>
                  {member.isOwner ? (
                    <Badge variant="secondary">Dono</Badge>
                  ) : (
                    <div className="flex gap-2">
                      <DataTableRowActionButton
                        label="Editar acesso"
                        accessibleLabel={`Editar acesso de ${member.name}`}
                        icon={Pencil}
                        onClick={() => setDialogState({ mode: "edit", member })}
                      />
                      <DataTableRowActionButton
                        label="Remover"
                        accessibleLabel={`Remover ${member.name}`}
                        icon={Trash2}
                        variant="destructive"
                        onClick={() => setMemberToRemove(member)}
                      />
                    </div>
                  )}
                </div>
                {!member.isOwner && (
                  <PageBadges
                    allowedModules={member.allowedModules}
                    canAccessSettings={member.canAccessSettings}
                  />
                )}
              </li>
            ))}
          </ul>

          {team.invitations.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-sm">Convites enviados</h3>
              <ul className="flex flex-col gap-3">
                {team.invitations.map((invitation) => (
                  <li key={invitation.id} className={CARD_CLASS_NAME}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-semibold text-base">
                          {invitation.inviteeName}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {invitation.status === "expired"
                            ? "Convite vencido. Cancele e crie outro."
                            : `Aguardando · vale até ${format(new Date(invitation.expiresAt), "dd/MM")}`}
                        </span>
                      </div>
                      {invitation.status === "pending" && (
                        <InvitationShareActions
                          organizationName={organizationName}
                          inviteeName={invitation.inviteeName}
                          token={invitation.token}
                        />
                      )}
                      <DataTableRowActionButton
                        label="Cancelar convite"
                        accessibleLabel={`Cancelar convite de ${invitation.inviteeName}`}
                        icon={X}
                        variant="destructive"
                        onClick={() =>
                          deleteInvitationMutation.mutate(invitation.id, {
                            onSuccess: () =>
                              toast.success("Convite cancelado."),
                            onError: (error) => toast.error(error.message),
                          })
                        }
                      />
                    </div>
                    <PageBadges
                      allowedModules={invitation.allowedModules}
                      canAccessSettings={invitation.canAccessSettings}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div>
              <Button
                type="button"
                className="h-10"
                disabled={hasReachedLimit}
                onClick={() => setDialogState({ mode: "invite" })}
              >
                <UserPlus aria-hidden />
                Convidar pessoa
              </Button>
            </div>
            {team.maxMembers !== null && (
              <p className="text-muted-foreground text-sm">
                {hasReachedLimit
                  ? `Seu plano permite até ${team.maxMembers} pessoas na equipe, contando os convites pendentes. Para convidar mais, troque de plano na aba Assinatura.`
                  : `${usedSeats} de ${team.maxMembers} pessoas do seu plano.`}
              </p>
            )}
          </div>
        </>
      )}

      <TeamAccessDialog
        organizationId={organizationId}
        state={dialogState}
        visibleModuleIds={visibleModuleIds}
        onInvited={(inviteeName, token) => {
          setDialogState({ mode: "closed" });
          setCreatedInvitation({ inviteeName, token });
        }}
        onClose={() => setDialogState({ mode: "closed" })}
      />
      <InvitationLinkDialog
        organizationName={organizationName}
        invitation={createdInvitation}
        onClose={() => setCreatedInvitation(null)}
      />
      <ConfirmDialog
        isOpen={memberToRemove !== null}
        onOpenChange={(isOpen) => !isOpen && setMemberToRemove(null)}
        title="Remover acesso?"
        description={`${memberToRemove?.name ?? ""} deixa de acessar o ${organizationName}. O que essa pessoa registrou continua no sistema.`}
        confirmLabel="Remover"
        isConfirming={removeMemberMutation.isPending}
        onConfirm={confirmRemoveMember}
      />
    </section>
  );
}
