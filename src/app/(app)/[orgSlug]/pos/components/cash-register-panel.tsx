"use client";

import { format } from "date-fns";
import { ArrowDownToLine, ArrowUpFromLine, Lock, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { useOpenCashSessionQuery } from "@/features/cash-register/hooks/use-open-cash-session-query";
import type {
  CashMovementKind,
  CashSessionSummary,
} from "@/features/cash-register/types";
import { getPaymentMethodLabel } from "@/features/orders/payment-methods";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useIsOnline } from "@/hooks/use-is-online";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CashMovementDialog } from "./cash-movement-dialog";
import { CloseCashRegisterDialog } from "./close-cash-register-dialog";
import { OpenCashRegisterDialog } from "./open-cash-register-dialog";

type CashRegisterPanelProps = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
};

type CashDialogState =
  | { step: "closed" }
  | { step: "open-register" }
  | { step: "summary" }
  | { step: "movement"; kind: CashMovementKind }
  | { step: "close-register" };

const MOVEMENT_LABELS = {
  withdrawal: "Sangria",
  supply: "Reforço",
} as const satisfies Record<CashMovementKind, string>;

function SummaryRow({
  label,
  value,
  isStrong = false,
}: {
  label: string;
  value: string;
  isStrong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 text-sm",
        isStrong && "font-semibold text-base",
      )}
    >
      <span className={cn(!isStrong && "text-muted-foreground")}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function CashSessionDetails({ summary }: { summary: CashSessionSummary }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted-foreground text-sm">
        Aberto em {format(new Date(summary.openedAt), "dd/MM, HH:mm")}
        {summary.openedByName ? ` por ${summary.openedByName}` : ""}.
      </p>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold text-sm">Recebido</h3>
        {summary.payments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum pagamento ainda.
          </p>
        ) : (
          summary.payments.map((payment) => (
            <SummaryRow
              key={payment.method}
              label={getPaymentMethodLabel(payment.method)}
              value={formatCurrency(payment.amount)}
            />
          ))
        )}
        <SummaryRow
          label={`Total (${summary.orderCount} ${summary.orderCount === 1 ? "venda" : "vendas"})`}
          value={formatCurrency(summary.receivedTotal)}
          isStrong
        />
      </section>

      <section className="flex flex-col gap-2 border-t pt-4">
        <h3 className="font-semibold text-sm">Dinheiro na gaveta</h3>
        <SummaryRow
          label="Troco inicial"
          value={formatCurrency(summary.openingAmount)}
        />
        {summary.movements.map((movement) => (
          <SummaryRow
            key={movement.id}
            label={`${MOVEMENT_LABELS[movement.kind]}${movement.note ? ` · ${movement.note}` : ""}`}
            value={`${movement.kind === "withdrawal" ? "− " : ""}${formatCurrency(movement.amount)}`}
          />
        ))}
        <SummaryRow
          label="Esperado agora"
          value={formatCurrency(summary.expectedCash)}
          isStrong
        />
      </section>
    </div>
  );
}

export function CashRegisterPanel({
  organizationId,
  ticketBusiness,
}: CashRegisterPanelProps) {
  const cashSessionQuery = useOpenCashSessionQuery(organizationId);
  const isOnline = useIsOnline();
  const [dialogState, setDialogState] = useState<CashDialogState>({
    step: "closed",
  });
  const hasPromptedRef = useRef(false);
  const summary = cashSessionQuery.data ?? null;
  const isLoaded = cashSessionQuery.isSuccess;
  const isRegisterOpen = summary !== null;

  useEffect(() => {
    if (!isLoaded || isRegisterOpen || !isOnline || hasPromptedRef.current) {
      return;
    }
    hasPromptedRef.current = true;
    setDialogState({ step: "open-register" });
  }, [isLoaded, isRegisterOpen, isOnline]);

  function closeDialogs() {
    setDialogState({ step: "closed" });
  }

  function backToSummary() {
    setDialogState({ step: "summary" });
  }

  return (
    <>
      <Button
        variant={isLoaded && !isRegisterOpen ? "default" : "outline"}
        className="h-11 px-3 sm:px-4"
        aria-label={isRegisterOpen ? "Caixa aberto" : "Abrir caixa"}
        onClick={() =>
          setDialogState({
            step: isRegisterOpen ? "summary" : "open-register",
          })
        }
      >
        <Wallet aria-hidden />
        <span className="hidden sm:inline">
          {isLoaded && !isRegisterOpen ? "Abrir caixa" : "Caixa"}
        </span>
        {isRegisterOpen && (
          <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
        )}
      </Button>

      <OpenCashRegisterDialog
        organizationId={organizationId}
        isOpen={dialogState.step === "open-register"}
        onClose={closeDialogs}
      />

      <DetailsDialog
        isOpen={dialogState.step === "summary" && summary !== null}
        onOpenChange={(isOpen) => !isOpen && closeDialogs()}
        title="Caixa"
        footer={
          <>
            <Button
              variant="outline"
              className={DIALOG_ACTION_BUTTON_CLASS_NAME}
              onClick={() =>
                setDialogState({ step: "movement", kind: "withdrawal" })
              }
            >
              <ArrowUpFromLine aria-hidden />
              Sangria
            </Button>
            <Button
              variant="outline"
              className={DIALOG_ACTION_BUTTON_CLASS_NAME}
              onClick={() =>
                setDialogState({ step: "movement", kind: "supply" })
              }
            >
              <ArrowDownToLine aria-hidden />
              Reforço
            </Button>
            <Button
              className={cn(DIALOG_ACTION_BUTTON_CLASS_NAME, "col-span-2")}
              onClick={() => setDialogState({ step: "close-register" })}
            >
              <Lock aria-hidden />
              Fechar caixa
            </Button>
          </>
        }
      >
        {summary && <CashSessionDetails summary={summary} />}
      </DetailsDialog>

      <CashMovementDialog
        organizationId={organizationId}
        kind={dialogState.step === "movement" ? dialogState.kind : null}
        onClose={backToSummary}
      />

      <CloseCashRegisterDialog
        organizationId={organizationId}
        ticketBusiness={ticketBusiness}
        summary={summary}
        isOpen={dialogState.step === "close-register"}
        onClose={backToSummary}
        onClosed={closeDialogs}
      />
    </>
  );
}
