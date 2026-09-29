"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { FieldGroup } from "@/components/ui/field";
import {
  createQuickPaymentSchema,
  type OrderPaymentInput,
} from "@/features/orders/schemas";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PaymentMethodField } from "./payment-method-field";

type QuickPaymentDialogProps = {
  isOpen: boolean;
  orderTotal: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (payment: OrderPaymentInput) => void;
};

export function QuickPaymentDialog({
  isOpen,
  orderTotal,
  isSubmitting,
  onClose,
  onConfirm,
}: QuickPaymentDialogProps) {
  const quickPaymentSchema = useMemo(
    () => createQuickPaymentSchema(orderTotal),
    [orderTotal],
  );
  const form = useForm<OrderPaymentInput>({
    resolver: zodResolver(quickPaymentSchema),
  });
  const [selectedMethod, amountReceived] = useWatch({
    control: form.control,
    name: ["method", "amountReceived"],
  });
  const isCashPayment = selectedMethod === "cash";
  const change = (amountReceived ?? 0) - orderTotal;

  useEffect(() => {
    if (isOpen) form.reset({});
  }, [isOpen, form]);

  const handleSubmit = form.handleSubmit((payment) =>
    onConfirm(isCashPayment ? payment : { method: payment.method }),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Pagamento rápido"
      description={`Total do pedido: ${formatCurrency(orderTotal)}`}
      submitLabel="Confirmar pagamento"
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <PaymentMethodField control={form.control} />
        {isCashPayment && (
          <>
            <NumberField
              control={form.control}
              name="amountReceived"
              label="Valor recebido"
              format="currency"
              placeholder={`Ex.: ${formatCurrency(Math.ceil(orderTotal / 10) * 10)}`}
            />
            <div className="flex items-baseline justify-between rounded-[10px] bg-muted px-4 py-3">
              <span className="text-muted-foreground text-sm">Troco</span>
              <span
                aria-live="polite"
                className={cn(
                  "font-bold text-lg tabular-nums",
                  change < 0 && "text-muted-foreground",
                )}
              >
                {formatCurrency(Math.max(change, 0))}
              </span>
            </div>
          </>
        )}
      </FieldGroup>
    </FormDialog>
  );
}
