"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import {
  type DefaultValues,
  useController,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { useCreateInvitationMutation } from "@/features/team/hooks/use-create-invitation-mutation";
import { useUpdateMemberAccessMutation } from "@/features/team/hooks/use-update-member-access-mutation";
import {
  type TeamAccessFormInput,
  teamAccessFormSchema,
} from "@/features/team/schemas";
import type { TeamMember } from "@/features/team/types";
import { PageAccessField } from "../../components/page-access-field";

export type TeamAccessDialogState =
  | { mode: "closed" }
  | { mode: "invite" }
  | { mode: "edit"; member: TeamMember };

const EMPTY_INVITATION_FORM: DefaultValues<TeamAccessFormInput> = {
  inviteeName: "",
  hasOwnerAccess: false,
  allowedModules: [],
  canAccessSettings: false,
};

type TeamAccessDialogProps = {
  organizationId: OrganizationId;
  state: TeamAccessDialogState;
  visibleModuleIds: readonly AppModuleId[];
  onInvited: (inviteeName: string, token: string) => void;
  onClose: () => void;
};

function toFormValues(
  state: TeamAccessDialogState,
  visibleModuleIds: readonly AppModuleId[],
): DefaultValues<TeamAccessFormInput> {
  if (state.mode !== "edit") return EMPTY_INVITATION_FORM;
  return {
    inviteeName: state.member.name,
    hasOwnerAccess: state.member.hasOwnerAccess,
    allowedModules: state.member.allowedModules ?? [...visibleModuleIds],
    canAccessSettings: state.member.canAccessSettings,
  };
}

export function TeamAccessDialog({
  organizationId,
  state,
  visibleModuleIds,
  onInvited,
  onClose,
}: TeamAccessDialogProps) {
  const createInvitationMutation = useCreateInvitationMutation(organizationId);
  const updateAccessMutation = useUpdateMemberAccessMutation(organizationId);
  const form = useForm<TeamAccessFormInput>({
    resolver: zodResolver(teamAccessFormSchema),
    defaultValues: EMPTY_INVITATION_FORM,
  });
  const allowedModulesField = useController({
    control: form.control,
    name: "allowedModules",
  });
  const settingsField = useController({
    control: form.control,
    name: "canAccessSettings",
  });
  const isOpen = state.mode !== "closed";
  const isEditing = state.mode === "edit";
  const hasOwnerAccess = useWatch({
    control: form.control,
    name: "hasOwnerAccess",
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(toFormValues(state, visibleModuleIds));
  }, [isOpen, state, visibleModuleIds, form]);

  const handleSubmit = form.handleSubmit((values) => {
    if (state.mode === "edit") {
      updateAccessMutation.mutate(
        {
          userId: state.member.userId,
          input: {
            fullName: values.inviteeName,
            hasOwnerAccess: values.hasOwnerAccess,
            allowedModules: values.allowedModules,
            canAccessSettings: values.canAccessSettings,
          },
        },
        {
          onSuccess: () => {
            toast.success(`${values.inviteeName} atualizado.`);
            onClose();
          },
          onError: (error) => toast.error(error.message),
        },
      );
      return;
    }
    const { hasOwnerAccess: _ignoredOwnerAccess, ...invitation } = values;
    createInvitationMutation.mutate(invitation, {
      onSuccess: ({ token }) => onInvited(values.inviteeName, token),
      onError: (error) => toast.error(error.message),
    });
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={
        state.mode === "edit"
          ? `Editar ${state.member.name}`
          : "Convidar pessoa"
      }
      description={
        isEditing
          ? "Mude o nome ou as páginas que essa pessoa pode ver."
          : "A pessoa recebe um link, entra com a conta dela e vê só as páginas que você liberar. O link vale por 7 dias."
      }
      submitLabel={isEditing ? "Salvar" : "Gerar convite"}
      isSubmitting={
        createInvitationMutation.isPending || updateAccessMutation.isPending
      }
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="inviteeName"
          label="Nome da pessoa"
          placeholder="Ex.: João, contador"
          autoComplete="off"
        />
        {isEditing && (
          <SwitchField
            control={form.control}
            name="hasOwnerAccess"
            label="Acesso de dono"
            description="Para sócios. Vê e faz tudo o que o dono faz, inclusive equipe e assinatura. Só não exclui o estabelecimento."
          />
        )}
        {!hasOwnerAccess && (
          <PageAccessField
            allowedModules={allowedModulesField.field.value}
            canAccessSettings={settingsField.field.value}
            visibleModuleIds={visibleModuleIds}
            errorMessage={allowedModulesField.fieldState.error?.message}
            onAllowedModulesChange={allowedModulesField.field.onChange}
            onCanAccessSettingsChange={settingsField.field.onChange}
          />
        )}
      </FieldGroup>
    </FormDialog>
  );
}
