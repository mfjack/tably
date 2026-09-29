"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { MaskedField } from "@/components/form/masked-field";
import { NumberField } from "@/components/form/number-field";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { FieldGroup } from "@/components/ui/field";
import { useSaveCustomerAccountMutation } from "@/features/customer-accounts/hooks/use-save-customer-account-mutation";
import {
  type CustomerAccountInput,
  customerAccountSchema,
} from "@/features/customer-accounts/schemas";
import type { CustomerAccount } from "@/features/customer-accounts/types";
import type { OrganizationId } from "@/features/organizations/types";

const EMPTY_ACCOUNT_FORM: DefaultValues<CustomerAccountInput> = {
  name: "",
  phone: "",
  note: "",
  isActive: true,
};

type CustomerAccountFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  account?: CustomerAccount;
  onClose: () => void;
};

function toFormValues(
  account: CustomerAccount,
): DefaultValues<CustomerAccountInput> {
  return {
    name: account.name,
    phone: account.phone ?? "",
    creditLimit: account.creditLimit ?? undefined,
    note: account.note ?? "",
    isActive: account.isActive,
  };
}

export function CustomerAccountFormDialog({
  organizationId,
  isOpen,
  account,
  onClose,
}: CustomerAccountFormDialogProps) {
  const saveAccountMutation = useSaveCustomerAccountMutation(organizationId);
  const form = useForm<CustomerAccountInput>({
    resolver: zodResolver(customerAccountSchema),
    defaultValues: EMPTY_ACCOUNT_FORM,
  });
  const isEditing = account !== undefined;

  useEffect(() => {
    if (!isOpen) return;
    form.reset(account ? toFormValues(account) : EMPTY_ACCOUNT_FORM);
    saveAccountMutation.reset();
  }, [isOpen, account, form, saveAccountMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    saveAccountMutation.mutate(
      { accountId: account?.id ?? null, input: values },
      {
        onSuccess: () => {
          toast.success(isEditing ? "Conta atualizada." : "Conta criada.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    ),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isEditing ? "Editar conta" : "Nova conta"}
      description="Clientes que compram para pagar depois."
      submitLabel={isEditing ? "Salvar" : "Criar conta"}
      isSubmitting={saveAccountMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome do cliente"
          placeholder="Ex.: Karen Souza"
          autoComplete="off"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <MaskedField
            control={form.control}
            name="phone"
            label="Telefone"
            mask="phone"
            placeholder="00 00000-0000"
            autoComplete="off"
          />
          <NumberField
            control={form.control}
            name="creditLimit"
            label="Limite de crédito"
            format="currency"
            placeholder="Sem limite"
          />
        </div>
        <TextareaField
          control={form.control}
          name="note"
          label="Observação"
          placeholder="Ex.: Paga todo dia 5"
        />
        {isEditing && (
          <SwitchField
            control={form.control}
            name="isActive"
            label="Conta ativa"
            description="Contas inativas não aparecem no pagamento do PDV."
          />
        )}
      </FieldGroup>
    </FormDialog>
  );
}
