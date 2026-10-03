"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { MaskedField } from "@/components/form/masked-field";
import { NumberField } from "@/components/form/number-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useCreateLoyaltyCustomerMutation } from "@/features/loyalty/hooks/use-create-loyalty-customer-mutation";
import {
  type LoyaltyCustomerInput,
  loyaltyCustomerSchema,
} from "@/features/loyalty/schemas";
import type { OrganizationId } from "@/features/organizations/types";

const EMPTY_CUSTOMER_FORM: LoyaltyCustomerInput = {
  name: "",
  phone: "",
  initialStamps: undefined,
};

type LoyaltyCustomerFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  onClose: () => void;
};

export function LoyaltyCustomerFormDialog({
  organizationId,
  isOpen,
  onClose,
}: LoyaltyCustomerFormDialogProps) {
  const createCustomerMutation =
    useCreateLoyaltyCustomerMutation(organizationId);
  const form = useForm<LoyaltyCustomerInput>({
    resolver: zodResolver(loyaltyCustomerSchema),
    defaultValues: EMPTY_CUSTOMER_FORM,
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(EMPTY_CUSTOMER_FORM);
    createCustomerMutation.reset();
  }, [isOpen, form, createCustomerMutation.reset]);

  function closeDialog(isDialogOpen: boolean) {
    if (!isDialogOpen) onClose();
  }

  const handleSubmit = form.handleSubmit((values) =>
    createCustomerMutation.mutate(values, {
      onSuccess: () => {
        toast.success(`${values.name} cadastrado na fidelidade.`);
        onClose();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={closeDialog}
      title="Novo cliente"
      description="Use para cadastrar quem já tinha cartão de papel. No dia a dia, o cadastro acontece sozinho no caixa."
      submitLabel="Cadastrar"
      isSubmitting={createCustomerMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome"
          placeholder="Ex.: Ana"
          autoComplete="off"
        />
        <MaskedField
          control={form.control}
          name="phone"
          label="Celular"
          mask="phone"
          placeholder="00 00000-0000"
          autoComplete="off"
        />
        <NumberField
          control={form.control}
          name="initialStamps"
          label="Selos que já tem"
          description="Deixe vazio se o cliente está começando agora."
          format="integer"
          placeholder="Ex.: 4"
        />
      </FieldGroup>
    </FormDialog>
  );
}
