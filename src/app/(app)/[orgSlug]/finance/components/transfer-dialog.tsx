"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useCreateFinancialTransferMutation } from "@/features/finance/hooks/use-create-financial-transfer-mutation";
import { type TransferInput, transferSchema } from "@/features/finance/schemas";
import type { FinancialAccount } from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";

type TransferDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  today: string;
  accounts: readonly FinancialAccount[];
  onClose: () => void;
};

export function TransferDialog({
  organizationId,
  isOpen,
  today,
  accounts,
  onClose,
}: TransferDialogProps) {
  const createMutation = useCreateFinancialTransferMutation(organizationId);
  const form = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
  });
  const accountOptions = useMemo(
    () =>
      accounts
        .filter((account) => !account.isArchived)
        .map((account) => ({ value: account.id, label: account.name })),
    [accounts],
  );

  useEffect(() => {
    if (!isOpen) return;
    const defaultValues: DefaultValues<TransferInput> = {
      fromAccountId: undefined,
      toAccountId: undefined,
      amount: undefined,
      transferredOn: today,
      notes: "",
    };
    form.reset(defaultValues);
    createMutation.reset();
  }, [isOpen, today, form, createMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Transferência registrada.");
        onClose();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Transferência entre contas"
      description="Por exemplo, depósito do dinheiro do caixa no banco ou saque da maquininha."
      submitLabel="Transferir"
      isSubmitting={createMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={form.control}
            name="fromAccountId"
            label="De"
            options={accountOptions}
          />
          <SelectField
            control={form.control}
            name="toAccountId"
            label="Para"
            options={accountOptions}
          />
          <NumberField
            control={form.control}
            name="amount"
            label="Valor"
            format="currency"
            placeholder="Ex.: $ 500,00"
          />
          <TextField
            control={form.control}
            name="transferredOn"
            label="Data"
            type="date"
          />
        </div>
        <TextField
          control={form.control}
          name="notes"
          label="Observação"
          placeholder="Ex.: Depósito do caixa de sexta"
          autoComplete="off"
        />
      </FieldGroup>
    </FormDialog>
  );
}
