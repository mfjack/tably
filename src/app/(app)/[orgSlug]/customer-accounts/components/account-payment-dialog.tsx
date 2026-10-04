"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useRegisterAccountPaymentMutation } from "@/features/customer-accounts/hooks/use-register-account-payment-mutation";
import {
  type AccountPaymentInput,
  createAccountPaymentSchema,
} from "@/features/customer-accounts/schemas";
import type { CustomerAccount } from "@/features/customer-accounts/types";
import { CardSurchargeNotice } from "@/features/orders/components/card-surcharge-notice";
import { PaymentMethodField } from "@/features/orders/components/payment-method-field";
import type { PaymentMethod } from "@/features/orders/types";
import type {
  OrganizationId,
  OrganizationPaymentFees,
} from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";

const EMPTY_PAYMENT_FORM: DefaultValues<AccountPaymentInput> = { note: "" };

type AccountPaymentDialogProps = {
  organizationId: OrganizationId;
  account: CustomerAccount | null;
  paymentFees: OrganizationPaymentFees;
  acceptedPaymentMethods: readonly PaymentMethod[];
  onClose: () => void;
};

export function AccountPaymentDialog({
  organizationId,
  account,
  paymentFees,
  acceptedPaymentMethods,
  onClose,
}: AccountPaymentDialogProps) {
  const balance = account?.balance ?? 0;
  const paymentSchema = useMemo(
    () => createAccountPaymentSchema(balance),
    [balance],
  );
  const registerPaymentMutation =
    useRegisterAccountPaymentMutation(organizationId);
  const form = useForm<AccountPaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: EMPTY_PAYMENT_FORM,
  });
  const [amount, method] = useWatch({
    control: form.control,
    name: ["amount", "method"],
  });

  useEffect(() => {
    if (!account) return;
    form.reset(EMPTY_PAYMENT_FORM);
    registerPaymentMutation.reset();
  }, [account, form, registerPaymentMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    if (!account) return;
    registerPaymentMutation.mutate(
      { accountId: account.id, balance, input: values },
      {
        onSuccess: (remainingBalance) => {
          toast.success(`Pagamento de ${account.name} registrado.`, {
            description:
              remainingBalance > 0
                ? `Saldo restante: ${formatCurrency(remainingBalance)}`
                : "Conta quitada.",
          });
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  return (
    <FormDialog
      isOpen={account !== null}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Receber pagamento"
      description={
        account ? `${account.name} deve ${formatCurrency(balance)}.` : undefined
      }
      submitLabel="Registrar pagamento"
      isSubmitting={registerPaymentMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <NumberField
          control={form.control}
          name="amount"
          label="Valor recebido"
          format="currency"
          placeholder={`Até ${formatCurrency(balance)}`}
        />
        <PaymentMethodField
          control={form.control}
          name="method"
          methods={acceptedPaymentMethods}
        />
        <CardSurchargeNotice
          paymentFees={paymentFees}
          method={method}
          amount={amount ?? 0}
        />
        <TextField
          control={form.control}
          name="note"
          label="Observação"
          placeholder="Opcional"
          autoComplete="off"
        />
      </FieldGroup>
    </FormDialog>
  );
}
