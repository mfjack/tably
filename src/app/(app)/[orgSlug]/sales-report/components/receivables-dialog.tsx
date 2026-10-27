"use client";

import { Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { useUndoPaymentSettlementMutation } from "@/features/finance/hooks/use-undo-payment-settlement-mutation";
import {
  getReceivableKey,
  type PaymentReceivable,
  summarizeReceivables,
} from "@/features/finance/receivables";
import { getPaymentMethodLabel } from "@/features/orders/payment-methods";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConfirmSettlementDialog } from "./confirm-settlement-dialog";
import { formatShortDate, ReceivableBadge } from "./receivable-badge";

type ReceivablesDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  receivables: readonly PaymentReceivable[];
  today: string;
  onClose: () => void;
};

export function ReceivablesDialog({
  organizationId,
  isOpen,
  receivables,
  today,
  onClose,
}: ReceivablesDialogProps) {
  const undoMutation = useUndoPaymentSettlementMutation(organizationId);
  const [receivableToConfirm, setReceivableToConfirm] =
    useState<PaymentReceivable | null>(null);

  function undoConfirmation(receivable: PaymentReceivable) {
    undoMutation.mutate(
      { saleDate: receivable.saleDate, method: receivable.method },
      {
        onSuccess: () => toast.success("Confirmação desfeita."),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  if (isOpen && receivableToConfirm) {
    return (
      <ConfirmSettlementDialog
        organizationId={organizationId}
        receivable={receivableToConfirm}
        onClose={() => setReceivableToConfirm(null)}
      />
    );
  }

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Conferir recebimentos"
      size="large"
      footer={
        <DialogClose
          render={
            <Button
              variant="outline"
              className={cn(DIALOG_ACTION_BUTTON_CLASS_NAME, "col-span-2")}
            />
          }
        >
          Fechar
        </DialogClose>
      }
    >
      <ul className="flex flex-col divide-y overflow-hidden rounded-xl border">
        {receivables.map((receivable) => {
          const summary = summarizeReceivables([receivable], today);
          const isConfirmed = receivable.receivedAmount !== null;
          return (
            <li
              key={getReceivableKey(receivable)}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium capitalize">
                    {formatShortDate(receivable.saleDate)} ·{" "}
                    {getPaymentMethodLabel(receivable.method)}
                  </span>
                  {summary && summary.kind !== "waiting" && (
                    <ReceivableBadge summary={summary} />
                  )}
                </div>
                <span className="text-muted-foreground text-sm tabular-nums">
                  Vendeu {formatCurrency(receivable.gross)}
                  {receivable.fee > 0 &&
                    ` · taxa ${formatCurrency(receivable.fee)}`}{" "}
                  · cai {formatCurrency(receivable.net)}{" "}
                  {formatShortDate(receivable.expectedOn)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                {isConfirmed ? (
                  <>
                    <span className="font-semibold tabular-nums">
                      Caiu {formatCurrency(receivable.receivedAmount ?? 0)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Desfazer confirmação"
                      disabled={undoMutation.isPending}
                      onClick={() => undoConfirmation(receivable)}
                    >
                      <Undo2 aria-hidden />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReceivableToConfirm(receivable)}
                  >
                    Confirmar
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </DetailsDialog>
  );
}
