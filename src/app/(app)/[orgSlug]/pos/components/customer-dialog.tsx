"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { FormDialog } from "@/components/dialog/form-dialog";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useCheckCustomerNameMutation } from "@/features/orders/hooks/use-check-customer-name-mutation";
import { CUSTOMER_NAME_IN_USE_MESSAGE } from "@/features/orders/messages";
import {
  type OrderCustomerInput,
  orderCustomerSchema,
} from "@/features/orders/schemas";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";

const EMPTY_CUSTOMER_FORM: DefaultValues<OrderCustomerInput> = {
  customerName: "",
  isTakeaway: false,
};

type CustomerDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  takeawayFee: number;
  isTakeawayEnabled: boolean;
  onClose: () => void;
  onConfirm: (customer: OrderCustomerInput) => void;
};

export function CustomerDialog({
  organizationId,
  isOpen,
  takeawayFee,
  isTakeawayEnabled,
  onClose,
  onConfirm,
}: CustomerDialogProps) {
  const form = useForm<OrderCustomerInput>({
    resolver: zodResolver(orderCustomerSchema),
    defaultValues: EMPTY_CUSTOMER_FORM,
  });

  const checkCustomerNameMutation =
    useCheckCustomerNameMutation(organizationId);

  useEffect(() => {
    if (!isOpen) return;
    form.reset(EMPTY_CUSTOMER_FORM);
    checkCustomerNameMutation.reset();
  }, [isOpen, form, checkCustomerNameMutation.reset]);

  const handleSubmit = form.handleSubmit((customer) =>
    checkCustomerNameMutation.mutate(customer.customerName, {
      onSuccess: (isAvailable) => {
        if (isAvailable) {
          onConfirm(customer);
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
      title="Nome do cliente"
      isTitleHidden
      submitLabel="Pagamento"
      isSubmitting={checkCustomerNameMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="customerName"
          label="Nome do cliente"
          placeholder="Ex.: Diego"
          autoComplete="off"
        />
        {isTakeawayEnabled && (
          <SwitchField
            control={form.control}
            name="isTakeaway"
            label="Para levar"
            description={
              takeawayFee > 0
                ? `Acrescenta ${formatCurrency(takeawayFee)} ao total.`
                : undefined
            }
          />
        )}
      </FieldGroup>
    </FormDialog>
  );
}
