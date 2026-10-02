"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useRecordSubscriptionPaymentMutation } from "@/features/subscriptions/hooks/use-record-subscription-payment-mutation";
import {
  type SubscriptionPaymentInput,
  subscriptionPaymentSchema,
} from "@/features/subscriptions/schemas";
import type { AdminSubscription } from "@/features/subscriptions/types";

const EMPTY_PAYMENT_FORM: DefaultValues<SubscriptionPaymentInput> = {
  note: "",
};

type RecordPaymentDialogProps = {
  subscription: AdminSubscription | null;
  onClose: () => void;
};

export function RecordPaymentDialog({
  subscription,
  onClose,
}: RecordPaymentDialogProps) {
  const recordMutation = useRecordSubscriptionPaymentMutation();
  const form = useForm<SubscriptionPaymentInput>({
    resolver: zodResolver(subscriptionPaymentSchema),
    defaultValues: EMPTY_PAYMENT_FORM,
  });

  useEffect(() => {
    if (subscription) form.reset(EMPTY_PAYMENT_FORM);
  }, [subscription, form]);

  const handleSubmit = form.handleSubmit((input) => {
    if (!subscription) return;
    recordMutation.mutate(
      { organizationId: subscription.organizationId, input },
      {
        onSuccess: (paidUntil) => {
          toast.success(
            `Pagamento registrado. ${subscription.name} pago até ${format(new Date(paidUntil), "dd/MM/yyyy")}.`,
          );
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
        subscription
          ? `Pagamento de ${subscription.name}`
          : "Registrar pagamento"
      }
      description="Confira o Pix no banco antes de registrar. A assinatura é renovada a partir do vencimento atual."
      submitLabel="Registrar pagamento"
      isSubmitting={recordMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <NumberField
          control={form.control}
          name="amount"
          label="Valor recebido"
          format="currency"
          placeholder={
            subscription
              ? `Ex.: $ ${subscription.monthlyPrice.toFixed(2).replace(".", ",")}`
              : undefined
          }
        />
        <NumberField
          control={form.control}
          name="months"
          label="Meses pagos"
          format="integer"
          placeholder="Ex.: 1"
        />
        <TextField
          control={form.control}
          name="note"
          label="Observação (opcional)"
          placeholder="Ex.: Pix de 05/10"
          autoComplete="off"
        />
      </FieldGroup>
    </FormDialog>
  );
}
