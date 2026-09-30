"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useDeleteAccountMutation } from "@/features/auth/hooks/use-delete-account-mutation";
import { useOwnedOrganizationsQuery } from "@/features/auth/hooks/use-owned-organizations-query";
import {
  DELETE_ACCOUNT_CONFIRMATION,
  type DeleteAccountInput,
  deleteAccountSchema,
} from "@/features/auth/schemas";

type DeleteAccountSectionProps = {
  email: string;
};

export function DeleteAccountSection({ email }: DeleteAccountSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const ownedOrganizationsQuery = useOwnedOrganizationsQuery(isDialogOpen);
  const deleteAccountMutation = useDeleteAccountMutation();
  const form = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmation: "" },
  });
  const ownedOrganizations = ownedOrganizationsQuery.data ?? [];

  useEffect(() => {
    if (!isDialogOpen) return;
    form.reset({ confirmation: "" });
    deleteAccountMutation.reset();
  }, [isDialogOpen, form, deleteAccountMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    deleteAccountMutation.mutate(values, {
      onSuccess: () => toast.success("Sua conta foi excluída."),
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <section className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-destructive/40 bg-card p-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-semibold text-destructive text-lg">
          Excluir conta
        </h2>
        <p className="text-muted-foreground text-sm">
          Apaga seu acesso e todos os estabelecimentos em que você é dono, com
          produtos, vendas, financeiro, funcionários, ponto e holerites. Não dá
          para desfazer.
        </p>
      </header>
      <div>
        <Button
          type="button"
          variant="destructive"
          className="h-11 px-5"
          onClick={() => setIsDialogOpen(true)}
        >
          <Trash2 aria-hidden />
          Excluir minha conta
        </Button>
      </div>

      <FormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Excluir sua conta?"
        description={`A conta ${email} e todos os dados abaixo serão apagados para sempre.`}
        submitLabel="Excluir tudo"
        isSubmitting={deleteAccountMutation.isPending}
        onSubmit={handleSubmit}
      >
        <FieldGroup>
          <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 p-4 text-sm">
            <p className="font-medium">Estabelecimentos que serão apagados:</p>
            {ownedOrganizationsQuery.isPending ? (
              <p className="text-muted-foreground">Carregando…</p>
            ) : ownedOrganizations.length === 0 ? (
              <p className="text-muted-foreground">
                Nenhum. Só o seu acesso será apagado.
              </p>
            ) : (
              <ul className="list-disc pl-5">
                {ownedOrganizations.map((organization) => (
                  <li key={organization.id}>{organization.name}</li>
                ))}
              </ul>
            )}
            <p className="text-muted-foreground">
              Se precisar dos dados, exporte relatórios, espelhos de ponto e
              holerites antes.
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
    </section>
  );
}
