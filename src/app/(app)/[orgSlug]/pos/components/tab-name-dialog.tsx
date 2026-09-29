"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import type { z } from "zod";
import { FormDialog } from "@/components/dialog/form-dialog";
import { TextField } from "@/components/form/text-field";
import { useCheckCustomerNameMutation } from "@/features/orders/hooks/use-check-customer-name-mutation";
import { CUSTOMER_NAME_IN_USE_MESSAGE } from "@/features/orders/messages";
import { orderCustomerSchema } from "@/features/orders/schemas";
import type { OrganizationId } from "@/features/organizations/types";

const tabNameSchema = orderCustomerSchema.pick({ customerName: true });

type TabNameInput = z.infer<typeof tabNameSchema>;

const EMPTY_TAB_NAME_FORM: DefaultValues<TabNameInput> = { customerName: "" };

type TabNameDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  isCreatingTab: boolean;
  onClose: () => void;
  onConfirm: (customerName: string) => void;
};

export function TabNameDialog({
  organizationId,
  isOpen,
  isCreatingTab,
  onClose,
  onConfirm,
}: TabNameDialogProps) {
  const form = useForm<TabNameInput>({
    resolver: zodResolver(tabNameSchema),
    defaultValues: EMPTY_TAB_NAME_FORM,
  });
  const checkCustomerNameMutation =
    useCheckCustomerNameMutation(organizationId);

  useEffect(() => {
    if (!isOpen) return;
    form.reset(EMPTY_TAB_NAME_FORM);
    checkCustomerNameMutation.reset();
  }, [isOpen, form, checkCustomerNameMutation.reset]);

  const handleSubmit = form.handleSubmit(({ customerName }) =>
    checkCustomerNameMutation.mutate(customerName, {
      onSuccess: (isAvailable) => {
        if (isAvailable) {
          onConfirm(customerName);
          return;
        }
        form.setError("customerName", {
          message: CUSTOMER_NAME_IN_USE_MESSAGE,
        });
      },
      onError: (error) =>
        form.setError("customerName", { message: error.message }),
    }),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Criar comanda"
      isTitleHidden
      submitLabel="Criar comanda"
      isSubmitting={checkCustomerNameMutation.isPending || isCreatingTab}
      onSubmit={handleSubmit}
    >
      <TextField
        control={form.control}
        name="customerName"
        label="Nome do cliente"
        placeholder="Ex.: Diego"
        autoComplete="off"
      />
    </FormDialog>
  );
}
