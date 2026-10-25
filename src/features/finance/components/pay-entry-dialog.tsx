"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, MessageSquareText } from "lucide-react";
import { useEffect } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { DateField } from "@/components/form/date-field";
import { NumberField } from "@/components/form/number-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { usePayFinancialEntryMutation } from "@/features/finance/hooks/use-pay-financial-entry-mutation";
import { type PayEntryInput, payEntrySchema } from "@/features/finance/schemas";
import type { FinancialEntry } from "@/features/finance/types";

import type { OrganizationId } from "@/features/organizations/types";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { formatCurrency, formatDateKey } from "@/lib/format";

export type PayableEntry = Pick<
  FinancialEntry,
  | "id"
  | "kind"
  | "description"
  | "amount"
  | "dueDate"
  | "notes"
  | "supplierName"
>;

type PayEntryDialogProps = {
  organizationId: OrganizationId;
  entry: PayableEntry | null;
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
      submitLabel={isExpense ? "Pagar" : "Receber"}
      isSubmitting={payMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        {entry && (
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="font-semibold">{entry.description}</p>
                {entry.supplierName && (
                  <p className="text-muted-foreground text-sm">
                    {entry.supplierName}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <p className="font-semibold text-lg tabular-nums">
                  {formatCurrency(entry.amount)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Vence {formatDateKey(entry.dueDate)}
                </p>
              </div>
            </div>
            {entry.notes && (
              <div className="flex items-start gap-2 border-t pt-3 text-sm">
                <MessageSquareText
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <p className="min-w-0 flex-1 select-text whitespace-pre-line break-words">
                  {entry.notes}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Copiar observação"
                  onClick={() =>
                    entry.notes &&
                    copyToClipboard(entry.notes, "Observação copiada.")
                  }
                >
                  <Copy aria-hidden />
                </Button>
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <DateField
            control={form.control}
            name="paidAt"
            label={isExpense ? "Data do pagamento" : "Data do recebimento"}
          />
          <NumberField
            control={form.control}
            name="paidAmount"
            label={isExpense ? "Valor pago" : "Valor recebido"}
            description="Ajuste se teve juros ou desconto."
            isDescriptionCompact
            format="currency"
          />
        </div>
      </FieldGroup>
    </FormDialog>
  );
}
