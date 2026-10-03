"use client";

import { X } from "lucide-react";
import { type Control, useWatch } from "react-hook-form";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import type { CustomerAccount } from "@/features/customer-accounts/types";
import { getPaymentSurcharge } from "@/features/organizations/payment-fees";
import type { OrganizationPaymentFees } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_VALUES, PAYMENT_METHODS } from "../payment-methods";
import type { PaymentFormInput } from "../schemas";
import type { PaymentMethod } from "../types";
import { PaymentMethodField } from "./payment-method-field";

function toPaymentMethodOptions(methods: readonly PaymentMethod[]) {
  return methods.map((method) => ({
    value: method,
    label: PAYMENT_METHODS[method].label,
  }));
}

type PaymentLineFieldsProps = {
  control: Control<PaymentFormInput>;
  index: number;
  isSplit: boolean;
  orderTotal: number;
  remainingAmount: number;
  accounts: readonly CustomerAccount[];
  computedAmount?: number;
  onRemove?: () => void;
  methods?: readonly PaymentMethod[];
  paymentFees: OrganizationPaymentFees;
};

function getAccountDescription(account: CustomerAccount | undefined) {
  if (!account) return undefined;
  const balance = `Saldo devedor ${formatCurrency(account.balance)}`;
  if (account.creditLimit === null) return `${balance} · sem limite`;
  const available = Math.max(account.creditLimit - account.balance, 0);
  return `${balance} · disponível ${formatCurrency(available)}`;
}

export function PaymentLineFields({
  control,
  index,
  isSplit,
  orderTotal,
  remainingAmount,
  accounts,
  computedAmount,
  onRemove,
  methods = PAYMENT_METHOD_VALUES,
  paymentFees,
}: PaymentLineFieldsProps) {
  const [method, customerAccountId, typedAmount] = useWatch({
    control,
    name: [
      `payments.${index}.method`,
      `payments.${index}.customerAccountId`,
      `payments.${index}.amount`,
    ],
  });
  const chargedBase = isSplit
    ? (computedAmount ?? typedAmount ?? 0)
    : orderTotal;
  const surcharge = method
    ? getPaymentSurcharge(paymentFees, method, chargedBase)
    : 0;
  const surchargeNotice = surcharge > 0 && (
    <p className="rounded-lg bg-muted px-3 py-2 text-sm">
      Cobre{" "}
      <strong className="font-semibold tabular-nums">
        {formatCurrency(chargedBase + surcharge)}
      </strong>{" "}
      na maquininha
      <span className="text-muted-foreground">
        {" "}
        · inclui {formatCurrency(surcharge)} de taxa
      </span>
    </p>
  );
  const selectedAccount = accounts.find(
    (account) => account.id === customerAccountId,
  );
  const amountExample = formatCurrency(
    isSplit
      ? (computedAmount ?? (remainingAmount || orderTotal))
      : Math.ceil(orderTotal / 10) * 10,
  );
  const isAmountComputed = computedAmount !== undefined;

  const accountField = method === "customer_account" && (
    <SelectField
      control={control}
      name={`payments.${index}.customerAccountId`}
      label="Conta do cliente"
      placeholder={
        accounts.length > 0 ? "Selecione o cliente" : "Nenhuma conta cadastrada"
      }
      options={accounts.map((account) => ({
        value: account.id,
        label: account.name,
      }))}
      description={
        getAccountDescription(selectedAccount) ??
        (accounts.length === 0
          ? "Cadastre clientes na página Contas."
          : undefined)
      }
      isDisabled={accounts.length === 0}
    />
  );

  const cashField = method === "cash" && (
    <NumberField
      control={control}
      name={`payments.${index}.amountReceived`}
      label={isSplit ? "Valor recebido (opcional)" : "Valor recebido"}
      format="currency"
      placeholder={`Ex.: ${amountExample}`}
    />
  );

  if (!isSplit) {
    return (
      <>
        <PaymentMethodField
          control={control}
          name={`payments.${index}.method`}
          methods={methods}
        />
        {accountField}
        {cashField}
        {surchargeNotice}
      </>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <legend className="font-medium text-sm">Pessoa {index + 1}</legend>
        <span className="flex items-center gap-1">
          {isAmountComputed && (
            <span className="font-semibold text-sm tabular-nums">
              {formatCurrency(computedAmount)}
            </span>
          )}
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remover pessoa ${index + 1}`}
              onClick={onRemove}
            >
              <X aria-hidden />
            </Button>
          )}
        </span>
      </div>
      <div className={cn("grid gap-3", !isAmountComputed && "sm:grid-cols-2")}>
        <SelectField
          control={control}
          name={`payments.${index}.method`}
          label="Forma"
          placeholder="Escolha"
          options={toPaymentMethodOptions(methods)}
        />
        {!isAmountComputed && (
          <NumberField
            control={control}
            name={`payments.${index}.amount`}
            label="Valor"
            format="currency"
            placeholder={`Ex.: ${amountExample}`}
          />
        )}
      </div>
      {accountField}
      {cashField}
      {surchargeNotice}
    </fieldset>
  );
}
