"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { useDeleteFinancialAccountMutation } from "@/features/finance/hooks/use-delete-financial-account-mutation";
import { useSaveFinancialAccountMutation } from "@/features/finance/hooks/use-save-financial-account-mutation";
import { useSetFinancialAccountArchivedMutation } from "@/features/finance/hooks/use-set-financial-account-archived-mutation";
import { ACCOUNT_KIND_LABELS } from "@/features/finance/labels";
import { type AccountInput, accountSchema } from "@/features/finance/schemas";
import type { FinancialAccount } from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";

const ACCOUNT_KIND_OPTIONS = Object.entries(ACCOUNT_KIND_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const EMPTY_ACCOUNT_FORM: DefaultValues<AccountInput> = {
  name: "",
  kind: undefined,
  openingBalance: undefined,
};

type AccountFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; account: FinancialAccount };

type AccountsDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  accounts: readonly FinancialAccount[];
  onClose: () => void;
};

function AccountFormDialog({
  organizationId,
  state,
  onClose,
}: {
  organizationId: OrganizationId;
  state: AccountFormState;
  onClose: () => void;
}) {
  const saveMutation = useSaveFinancialAccountMutation(organizationId);
  const form = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: EMPTY_ACCOUNT_FORM,
  });
  const editingAccount = state.mode === "edit" ? state.account : null;

  useEffect(() => {
    if (state.mode === "closed") return;
    form.reset(
      state.mode === "edit"
        ? {
            name: state.account.name,
            kind: state.account.kind,
            openingBalance: state.account.openingBalance,
          }
        : EMPTY_ACCOUNT_FORM,
    );
    saveMutation.reset();
  }, [state, form, saveMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate(
      { accountId: editingAccount?.id ?? null, input: values },
      {
        onSuccess: () => {
          toast.success(editingAccount ? "Conta atualizada." : "Conta criada.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    ),
  );

  return (
    <FormDialog
      isOpen={state.mode !== "closed"}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={editingAccount ? "Editar conta" : "Nova conta"}
      description="Onde o dinheiro fica: caixa da loja, banco, maquininha ou carteira digital."
      submitLabel={editingAccount ? "Salvar" : "Criar conta"}
      isSubmitting={saveMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome"
          placeholder="Ex.: Itaú, SumUp"
          autoComplete="off"
        />
        <SelectField
          control={form.control}
          name="kind"
          label="Tipo"
          options={ACCOUNT_KIND_OPTIONS}
        />
        <NumberField
          control={form.control}
          name="openingBalance"
          label="Saldo inicial"
          description="Quanto tinha na conta quando você começou a usar o financeiro."
          format="currency"
          placeholder="Ex.: $ 1.500,00"
        />
      </FieldGroup>
    </FormDialog>
  );
}

export function AccountsDialog({
  organizationId,
  isOpen,
  accounts,
  onClose,
}: AccountsDialogProps) {
  const archiveMutation =
    useSetFinancialAccountArchivedMutation(organizationId);
  const deleteMutation = useDeleteFinancialAccountMutation(organizationId);
  const [formState, setFormState] = useState<AccountFormState>({
    mode: "closed",
  });

  return (
    <>
      <DetailsDialog
        isOpen={isOpen}
        onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
        title="Contas"
        footer={
          <>
            <DialogClose
              render={
                <Button
                  variant="outline"
                  className={DIALOG_ACTION_BUTTON_CLASS_NAME}
                />
              }
            >
              Fechar
            </DialogClose>
            <Button
              className={DIALOG_ACTION_BUTTON_CLASS_NAME}
              onClick={() => setFormState({ mode: "create" })}
            >
              <Plus aria-hidden />
              Nova conta
            </Button>
          </>
        }
      >
        <ul className="flex flex-col divide-y rounded-xl border">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center gap-2 px-3 py-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 truncate font-medium text-sm">
                  {account.name}
                  {account.isArchived && (
                    <Badge variant="outline">Arquivada</Badge>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {ACCOUNT_KIND_LABELS[account.kind]} · saldo inicial{" "}
                  {formatCurrency(account.openingBalance)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Editar ${account.name}`}
                onClick={() => setFormState({ mode: "edit", account })}
              >
                <Pencil aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={
                  account.isArchived
                    ? `Reativar ${account.name}`
                    : `Arquivar ${account.name}`
                }
                disabled={archiveMutation.isPending}
                onClick={() =>
                  archiveMutation.mutate(
                    { accountId: account.id, isArchived: !account.isArchived },
                    { onError: (error) => toast.error(error.message) },
                  )
                }
              >
                {account.isArchived ? (
                  <ArchiveRestore aria-hidden />
                ) : (
                  <Archive aria-hidden />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Excluir ${account.name}`}
                className="text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate(account.id, {
                    onSuccess: () => toast.success("Conta excluída."),
                    onError: (error) => toast.error(error.message),
                  })
                }
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      </DetailsDialog>
      <AccountFormDialog
        organizationId={organizationId}
        state={formState}
        onClose={() => setFormState({ mode: "closed" })}
      />
    </>
  );
}
