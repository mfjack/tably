"use client";

import { X } from "lucide-react";
import { type Control, useWatch } from "react-hook-form";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import type { CustomerAccount } from "@/features/customer-accounts/types";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHOD_VALUES, PAYMENT_METHODS } from "../payment-methods";
import type { PaymentFormInput } from "../schemas";
import { PaymentMethodField } from "./payment-method-field";

const PAYMENT_METHOD_OPTIONS = PAYMENT_METHOD_VALUES.map((method) => ({
  value: method,
  label: PAYMENT_METHODS[method].label,
}));

type PaymentLineFieldsProps = {
  control: Control<PaymentFormInput>;
  index: number;
  isSplit: boolean;
  orderTotal: number;
  remainingAmount: number;
  accounts: readonly CustomerAccount[];
  onRemove?: () => void;
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
  onRemove,
}: PaymentLineFieldsProps) {
  const [method, customerAccountId] = useWatch({
    control,
    name: [`payments.${index}.method`, `payments.${index}.customerAccountId`],
  });
  const selectedAccount = accounts.find(
    (account) => account.id === customerAccountId,
  );
  const amountExample = formatCurrency(
    isSplit ? remainingAmount || orderTotal : Math.ceil(orderTotal / 10) * 10,
  );

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
        />
        {accountField}
        {cashField}
      </>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <legend className="font-medium text-sm">Pagamento {index + 1}</legend>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remover pagamento ${index + 1}`}
            onClick={onRemove}
          >
            <X aria-hidden />
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          control={control}
          name={`payments.${index}.method`}
          label="Forma"
          placeholder="Escolha"
          options={PAYMENT_METHOD_OPTIONS}
        />
        <NumberField
          control={control}
          name={`payments.${index}.amount`}
          label="Valor"
          format="currency"
          placeholder={`Ex.: ${amountExample}`}
        />
      </div>
      {accountField}
      {cashField}
    </fieldset>
  );
}
