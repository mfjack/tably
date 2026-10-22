"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useController, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { useCreateInvitationMutation } from "@/features/team/hooks/use-create-invitation-mutation";
import { useUpdateMemberAccessMutation } from "@/features/team/hooks/use-update-member-access-mutation";
import {
  type InvitationInput,
  invitationSchema,
} from "@/features/team/schemas";
import type { TeamMember } from "@/features/team/types";
import { PageAccessField } from "../../components/page-access-field";

export type TeamAccessDialogState =
  | { mode: "closed" }
  | { mode: "invite" }
  | { mode: "edit"; member: TeamMember };

const EMPTY_INVITATION_FORM: DefaultValues<InvitationInput> = {
  inviteeName: "",
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
): DefaultValues<InvitationInput> {
  if (state.mode !== "edit") return EMPTY_INVITATION_FORM;
  return {
    inviteeName: state.member.name,
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
  const form = useForm<InvitationInput>({
    resolver: zodResolver(invitationSchema),
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
            allowedModules: values.allowedModules,
            canAccessSettings: values.canAccessSettings,
          },
        },
        {
          onSuccess: () => {
            toast.success("Acesso atualizado.");
            onClose();
          },
          onError: (error) => toast.error(error.message),
        },
      );
      return;
    }
    createInvitationMutation.mutate(values, {
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
          ? `Acesso de ${state.member.name}`
          : "Convidar pessoa"
      }
      description={
        isEditing
          ? "Escolha as páginas que essa pessoa pode ver."
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
        {!isEditing && (
          <TextField
            control={form.control}
            name="inviteeName"
            label="Nome da pessoa"
            placeholder="Ex.: João, contador"
            autoComplete="off"
          />
        )}
        <PageAccessField
          allowedModules={allowedModulesField.field.value}
          canAccessSettings={settingsField.field.value}
          visibleModuleIds={visibleModuleIds}
          errorMessage={allowedModulesField.fieldState.error?.message}
          onAllowedModulesChange={allowedModulesField.field.onChange}
          onCanAccessSettingsChange={settingsField.field.onChange}
        />
      </FieldGroup>
    </FormDialog>
  );
}
