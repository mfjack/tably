"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
  onClose: () => void;
  isOpeningTab: boolean;
  onConfirm: (customer: OrderCustomerInput) => void;
  onOpenTab: (customer: OrderCustomerInput) => void;
};

type SubmitIntent = "continue" | "open-tab";

export function CustomerDialog({
  organizationId,
  isOpen,
  takeawayFee,
  onClose,
  isOpeningTab,
  onConfirm,
  onOpenTab,
}: CustomerDialogProps) {
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent | null>(null);
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

  function buildSubmitHandler(
    intent: SubmitIntent,
    onValidCustomer: (customer: OrderCustomerInput) => void,
  ) {
    return form.handleSubmit((customer) => {
      setSubmitIntent(intent);
      checkCustomerNameMutation.mutate(customer.customerName, {
        onSuccess: (isAvailable) => {
          if (isAvailable) {
            onValidCustomer(customer);
            return;
          }
          form.setError("customerName", {
            message: CUSTOMER_NAME_IN_USE_MESSAGE,
          });
        },
        onError: (error) =>
          form.setError("customerName", { message: error.message }),
      });
    });
  }

  const isCheckingName = checkCustomerNameMutation.isPending;

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Nome do cliente"
      isTitleHidden
      submitLabel="Pagamento"
      isSubmitting={isCheckingName && submitIntent === "continue"}
      onSubmit={buildSubmitHandler("continue", onConfirm)}
      secondaryAction={{
        label: "Abrir comanda",
        isPending:
          isOpeningTab || (isCheckingName && submitIntent === "open-tab"),
        onClick: buildSubmitHandler("open-tab", onOpenTab),
      }}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="customerName"
          label="Nome do cliente"
          placeholder="Ex.: Diego"
          autoComplete="off"
        />
        <SwitchField
          control={form.control}
          name="isTakeaway"
          label="Para levar"
          description={`Acrescenta ${formatCurrency(takeawayFee)} ao total.`}
        />
      </FieldGroup>
    </FormDialog>
  );
}
