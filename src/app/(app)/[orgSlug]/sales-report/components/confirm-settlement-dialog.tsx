"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { useConfirmPaymentSettlementMutation } from "@/features/finance/hooks/use-confirm-payment-settlement-mutation";
import {
  type PaymentReceivable,
  type PaymentSettlementInput,
  paymentSettlementSchema,
} from "@/features/finance/receivables";
import { getPaymentMethodLabel } from "@/features/orders/payment-methods";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency, formatDateKey } from "@/lib/format";

type ConfirmSettlementDialogProps = {
  organizationId: OrganizationId;
  receivable: PaymentReceivable | null;
  onClose: () => void;
};

export function ConfirmSettlementDialog({
  organizationId,
  receivable,
  onClose,
}: ConfirmSettlementDialogProps) {
  const confirmMutation = useConfirmPaymentSettlementMutation(organizationId);
  const [isUsingExpectedAmount, setIsUsingExpectedAmount] = useState(false);
  const form = useForm<PaymentSettlementInput>({
    resolver: zodResolver(paymentSettlementSchema),
  });

  useEffect(() => {
    if (!receivable) return;
    form.reset({
      saleDate: receivable.saleDate,
      method: receivable.method,
      receivedAmount: receivable.receivedAmount ?? undefined,
    });
    confirmMutation.reset();
  }, [receivable, form, confirmMutation.reset]);

  function confirm(receivedAmount: number, isExpectedAmount: boolean) {
    if (!receivable) return;
    setIsUsingExpectedAmount(isExpectedAmount);
    confirmMutation.mutate(
      {
        saleDate: receivable.saleDate,
        method: receivable.method,
        receivedAmount,
      },
      {
        onSuccess: () => {
          toast.success("Recebimento conferido.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  const handleSubmit = form.handleSubmit((values) =>
    confirm(values.receivedAmount, false),
  );

  return (
    <FormDialog
      isOpen={receivable !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Quanto caiu na conta?"
      description={
        receivable
          ? `${getPaymentMethodLabel(receivable.method)} das vendas de ${formatDateKey(receivable.saleDate)}. Previsto: ${formatCurrency(receivable.net)}.`
          : undefined
      }
      submitLabel="Confirmar"
      isSubmitting={confirmMutation.isPending && !isUsingExpectedAmount}
      onSubmit={handleSubmit}
      secondaryAction={
        receivable
          ? {
              label: "Caiu o previsto",
              isPending: confirmMutation.isPending && isUsingExpectedAmount,
              onClick: () => confirm(receivable.net, true),
            }
          : undefined
      }
    >
      <NumberField
        control={form.control}
        name="receivedAmount"
        label="Valor que caiu na conta"
        format="currency"
        placeholder={
          receivable ? `Previsto: ${formatCurrency(receivable.net)}` : undefined
        }
      />
    </FormDialog>
  );
}
