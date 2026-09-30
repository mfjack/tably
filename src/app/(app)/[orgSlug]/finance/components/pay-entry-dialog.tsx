"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { usePayFinancialEntryMutation } from "@/features/finance/hooks/use-pay-financial-entry-mutation";
import { type PayEntryInput, payEntrySchema } from "@/features/finance/schemas";
import type { FinancialEntry } from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency, formatDateKey } from "@/lib/format";

type PayEntryDialogProps = {
  organizationId: OrganizationId;
  entry: FinancialEntry | null;
  today: string;
  onClose: () => void;
};

export function PayEntryDialog({
  organizationId,
  entry,
  today,
  onClose,
}: PayEntryDialogProps) {
  const payMutation = usePayFinancialEntryMutation(organizationId);
  const form = useForm<PayEntryInput>({
    resolver: zodResolver(payEntrySchema),
  });
  const isExpense = entry?.kind === "expense";

  useEffect(() => {
    if (!entry) return;
    const defaultValues: DefaultValues<PayEntryInput> = {
      paidAt: today,
      paidAmount: entry.amount,
    };
    form.reset(defaultValues);
    payMutation.reset();
  }, [entry, today, form, payMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    if (!entry) return;
    payMutation.mutate(
      { entryId: entry.id, input: values },
      {
        onSuccess: () => {
          toast.success(
            isExpense ? "Pagamento registrado." : "Recebimento registrado.",
          );
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  return (
    <FormDialog
      isOpen={entry !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={isExpense ? "Registrar pagamento" : "Registrar recebimento"}
      description={
        entry
          ? `${entry.description} · ${formatCurrency(entry.amount)} · vence ${formatDateKey(entry.dueDate)}. Se pagou com juros ou desconto, ajuste o valor.`
          : undefined
      }
      submitLabel={isExpense ? "Pagar" : "Receber"}
      isSubmitting={payMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            control={form.control}
            name="paidAt"
            label="Data"
            type="date"
          />
          <NumberField
            control={form.control}
            name="paidAmount"
            label={isExpense ? "Valor pago" : "Valor recebido"}
            format="currency"
          />
        </div>
      </FieldGroup>
    </FormDialog>
  );
}
