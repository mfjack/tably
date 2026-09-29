"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  FormDialog,
  type FormDialogSecondaryAction,
} from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { FieldGroup } from "@/components/ui/field";
import { useCustomerAccountsQuery } from "@/features/customer-accounts/hooks/use-customer-accounts-query";
import type { CustomerAccount } from "@/features/customer-accounts/types";
import {
  createQuickPaymentSchema,
  type OrderPaymentInput,
} from "@/features/orders/schemas";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OrderSummary, type OrderSummaryData } from "./order-summary";
import { PaymentMethodField } from "./payment-method-field";

type PaymentDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  title: string;
  submitLabel: string;
  summary: OrderSummaryData;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (payment: OrderPaymentInput) => void;
  secondaryAction?: FormDialogSecondaryAction;
};

function getAccountDescription(account: CustomerAccount | undefined) {
  if (!account) return undefined;
  const balance = `Saldo devedor ${formatCurrency(account.balance)}`;
  if (account.creditLimit === null) return `${balance} · sem limite`;
  const available = Math.max(account.creditLimit - account.balance, 0);
  return `${balance} · disponível ${formatCurrency(available)}`;
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
  const quickPaymentSchema = useMemo(
    () => createQuickPaymentSchema(orderTotal),
    [orderTotal],
  );
  const form = useForm<OrderPaymentInput>({
    resolver: zodResolver(quickPaymentSchema),
  });
  const [selectedMethod, amountReceived, customerAccountId] = useWatch({
    control: form.control,
    name: ["method", "amountReceived", "customerAccountId"],
  });
  const isCashPayment = selectedMethod === "cash";
  const isAccountPayment = selectedMethod === "customer_account";
  const customerAccountsQuery = useCustomerAccountsQuery(organizationId);
  const activeAccounts = (customerAccountsQuery.data ?? []).filter(
    (account) => account.isActive,
  );
  const selectedAccount = activeAccounts.find(
    (account) => account.id === customerAccountId,
  );
  const change = (amountReceived ?? 0) - orderTotal;

  useEffect(() => {
    if (isOpen) form.reset({});
  }, [isOpen, form]);

  const handleSubmit = form.handleSubmit((payment) => {
    if (isCashPayment) {
      onConfirm({
        method: payment.method,
        amountReceived: payment.amountReceived,
      });
      return;
    }
    if (isAccountPayment) {
      onConfirm({
        method: payment.method,
        customerAccountId: payment.customerAccountId,
      });
      return;
    }
    onConfirm({ method: payment.method });
  });

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
        <PaymentMethodField control={form.control} name="method" />
        {isAccountPayment && (
          <SelectField
            control={form.control}
            name="customerAccountId"
            label="Conta do cliente"
            placeholder={
              activeAccounts.length > 0
                ? "Selecione o cliente"
                : "Nenhuma conta cadastrada"
            }
            options={activeAccounts.map((account) => ({
              value: account.id,
              label: account.name,
            }))}
            description={
              getAccountDescription(selectedAccount) ??
              (activeAccounts.length === 0
                ? "Cadastre clientes na página Contas."
                : undefined)
            }
            isDisabled={activeAccounts.length === 0}
          />
        )}
        {isCashPayment && (
          <>
            <NumberField
              control={form.control}
              name="amountReceived"
              label="Valor recebido"
              format="currency"
              placeholder={`Ex.: ${formatCurrency(Math.ceil(orderTotal / 10) * 10)}`}
            />
            <div className="flex items-baseline justify-between rounded-lg bg-muted px-4 py-3">
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
