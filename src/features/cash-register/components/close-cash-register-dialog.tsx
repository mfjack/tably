"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { TextareaField } from "@/components/form/textarea-field";
import { FieldGroup } from "@/components/ui/field";
import { useCloseCashRegisterMutation } from "@/features/cash-register/hooks/use-close-cash-register-mutation";
import { printCashClosing } from "@/features/cash-register/print-cash-closing";
import {
  type CloseCashSessionInput,
  closeCashSessionSchema,
} from "@/features/cash-register/schemas";
import type { CashSessionSummary } from "@/features/cash-register/types";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const CLOSED_TOAST_DURATION_IN_MS = 15_000;

const EMPTY_CLOSE_FORM: DefaultValues<CloseCashSessionInput> = { note: "" };

type CloseCashRegisterDialogProps = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
  summary: CashSessionSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onClosed: () => void;
};

function getDifferenceText(difference: number) {
  if (difference === 0) return "O caixa bate certinho.";
  const amount = formatCurrency(Math.abs(difference));
  return difference > 0 ? `Sobra de ${amount}.` : `Falta de ${amount}.`;
}

export function CloseCashRegisterDialog({
  organizationId,
  ticketBusiness,
  summary,
  isOpen,
  onClose,
  onClosed,
}: CloseCashRegisterDialogProps) {
  const closeMutation = useCloseCashRegisterMutation(organizationId);
  const form = useForm<CloseCashSessionInput>({
    resolver: zodResolver(closeCashSessionSchema),
    defaultValues: EMPTY_CLOSE_FORM,
  });
  const countedCash = useWatch({ control: form.control, name: "countedCash" });
  const expectedCash = summary?.expectedCash ?? 0;
  const differenceCents =
    countedCash === undefined
      ? null
      : Math.round(countedCash * 100) - Math.round(expectedCash * 100);

  useEffect(() => {
    if (isOpen) form.reset(EMPTY_CLOSE_FORM);
  }, [isOpen, form]);

  const handleSubmit = form.handleSubmit((values) =>
    closeMutation.mutate(values, {
      onSuccess: (closedSummary) => {
        onClosed();
        toast.success("Caixa fechado.", {
          duration: CLOSED_TOAST_DURATION_IN_MS,
          action: {
            label: "Imprimir",
            onClick: () => printCashClosing(closedSummary, ticketBusiness),
          },
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <FormDialog
      isOpen={isOpen && summary !== null}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Fechar caixa"
      description="Conte o dinheiro da gaveta e informe o valor. Os outros meios de pagamento são conferidos pelo extrato da maquininha e do banco."
      submitLabel="Fechar caixa"
      isSubmitting={closeMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <div className="flex items-baseline justify-between rounded-lg bg-muted px-4 py-3">
          <span className="text-muted-foreground text-sm">
            Dinheiro esperado na gaveta
          </span>
          <span className="font-bold text-lg tabular-nums">
            {formatCurrency(expectedCash)}
          </span>
        </div>
        <NumberField
          control={form.control}
          name="countedCash"
          label="Dinheiro contado"
          format="currency"
          placeholder="Ex.: $ 250,00"
        />
        {differenceCents !== null && (
          <p
            aria-live="polite"
            className={cn(
              "rounded-lg px-4 py-3 font-medium text-sm",
              differenceCents === 0
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {getDifferenceText(differenceCents / 100)}
          </p>
        )}
        <TextareaField
          control={form.control}
          name="note"
          label="Observação (opcional)"
          placeholder="Ex.: Faltou troco de moedas"
        />
      </FieldGroup>
    </FormDialog>
  );
}
