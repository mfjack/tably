"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import {
  DELETE_ACCOUNT_CONFIRMATION,
  type DeleteAccountInput,
  deleteAccountSchema,
} from "@/features/auth/schemas";
import { useDeleteAdminOrganizationMutation } from "@/features/subscriptions/hooks/use-delete-admin-organization-mutation";
import type { AdminSubscription } from "@/features/subscriptions/types";

type DeleteOrganizationDialogProps = {
  subscription: AdminSubscription | null;
  onClose: () => void;
};

export function DeleteOrganizationDialog({
  subscription,
  onClose,
}: DeleteOrganizationDialogProps) {
  const deleteMutation = useDeleteAdminOrganizationMutation();
  const form = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmation: "" },
  });

  useEffect(() => {
    if (subscription) form.reset({ confirmation: "" });
  }, [subscription, form]);

  const handleSubmit = form.handleSubmit((input) => {
    if (!subscription) return;
    deleteMutation.mutate(
      { organizationId: subscription.organizationId, input },
      {
        onSuccess: () => {
          toast.success(`${subscription.name} excluído.`);
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  return (
    <FormDialog
      isOpen={subscription !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={
        subscription ? `Excluir ${subscription.name}?` : "Excluir cliente?"
      }
      description="Não dá para desfazer."
      submitLabel="Excluir tudo"
      isSubmitting={deleteMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 p-4 text-sm">
          <p>
            Apaga o estabelecimento com produtos, vendas, financeiro,
            funcionários, ponto, holerites, arquivos e assinatura. A cobrança
            automática, se houver, é cancelada.
          </p>
          <p className="text-muted-foreground">
            O login de {subscription?.ownerEmail ?? "quem é dono"} também é
            apagado se não tiver outro estabelecimento.
          </p>
        </div>
        <TextField
          control={form.control}
          name="confirmation"
          label={`Digite ${DELETE_ACCOUNT_CONFIRMATION} para confirmar`}
          placeholder={DELETE_ACCOUNT_CONFIRMATION}
          autoComplete="off"
        />
      </FieldGroup>
    </FormDialog>
  );
}
