"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Split } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  FormDialog,
  type FormDialogSecondaryAction,
} from "@/components/dialog/form-dialog";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useCustomerAccountsQuery } from "@/features/customer-accounts/hooks/use-customer-accounts-query";
import {
  createPaymentFormSchema,
  type OrderPaymentInput,
  type PaymentFormInput,
} from "@/features/orders/schemas";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getPaymentsChange } from "../order-payments";
import { OrderSummary, type OrderSummaryData } from "./order-summary";
import { PaymentLineFields } from "./payment-line-fields";

type PaymentDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  title: string;
  submitLabel: string;
  summary: OrderSummaryData;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (payments: OrderPaymentInput[]) => void;
  secondaryAction?: FormDialogSecondaryAction;
};

const MAX_PAYMENT_LINES = 4;

const EMPTY_PAYMENT_LINE = {} as PaymentFormInput["payments"][number];

function toCents(value: number) {
  return Math.round(value * 100);
}

function getBalanceMessage(remainingCents: number) {
  if (remainingCents === 0) return "Os pagamentos fecham o total.";
  const amount = formatCurrency(Math.abs(remainingCents) / 100);
  return remainingCents > 0 ? `Falta ${amount}` : `Passou ${amount} do total`;
}

export function PaymentDialog({
  organizationId,
  isOpen,
  summary,
  isSubmitting,
  onClose,
  onConfirm,
  title,
  submitLabel,
  secondaryAction,
}: PaymentDialogProps) {
  const orderTotal = summary.total;
  const paymentFormSchema = useMemo(
    () => createPaymentFormSchema(orderTotal),
    [orderTotal],
  );
  const form = useForm<PaymentFormInput>({
    resolver: zodResolver(paymentFormSchema),
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "payments",
  });
  const payments = useWatch({ control: form.control, name: "payments" });
  const customerAccountsQuery = useCustomerAccountsQuery(organizationId);
  const activeAccounts = useMemo(
    () =>
      (customerAccountsQuery.data ?? []).filter((account) => account.isActive),
    [customerAccountsQuery.data],
  );
  const isSplit = fields.length > 1;
  const paidCents = (payments ?? []).reduce(
    (total, payment) => total + toCents(payment?.amount ?? 0),
    0,
  );
  const remainingCents = toCents(orderTotal) - paidCents;
  const change = getPaymentsChange(payments ?? [], orderTotal);
  const paymentsError = form.formState.errors.payments?.root?.message;

  useEffect(() => {
    if (isOpen) form.reset({ payments: [EMPTY_PAYMENT_LINE] });
  }, [isOpen, form]);

  const handleSubmit = form.handleSubmit(({ payments: submittedPayments }) =>
    onConfirm(submittedPayments),
  );

  function addPaymentLine() {
    append(EMPTY_PAYMENT_LINE, { shouldFocus: false });
  }

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={title}
      submitLabel={submitLabel}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      secondaryAction={secondaryAction}
    >
      <FieldGroup>
        <OrderSummary summary={summary} />
        {fields.map((field, index) => (
          <PaymentLineFields
            key={field.id}
            control={form.control}
            index={index}
            isSplit={isSplit}
            orderTotal={orderTotal}
            remainingAmount={Math.max(remainingCents, 0) / 100}
            accounts={activeAccounts}
            onRemove={isSplit ? () => remove(index) : undefined}
          />
        ))}
        {fields.length < MAX_PAYMENT_LINES && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={addPaymentLine}
          >
            {isSplit ? <Plus aria-hidden /> : <Split aria-hidden />}
            {isSplit ? "Adicionar forma de pagamento" : "Dividir pagamento"}
          </Button>
        )}
        {isSplit && (
          <div
            aria-live="polite"
            className={cn(
              "rounded-lg px-4 py-3 font-medium text-sm",
              remainingCents === 0
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {getBalanceMessage(remainingCents)}
          </div>
        )}
        {paymentsError && <FieldError>{paymentsError}</FieldError>}
        {change > 0 && (
          <div className="flex items-baseline justify-between rounded-lg bg-muted px-4 py-3">
            <span className="text-muted-foreground text-sm">Troco</span>
            <span aria-live="polite" className="font-bold text-lg tabular-nums">
              {formatCurrency(change)}
            </span>
          </div>
        )}
      </FieldGroup>
    </FormDialog>
  );
}
