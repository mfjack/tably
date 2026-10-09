"use client";

import { ArrowDownToLine, ArrowUpFromLine, Lock, Wallet } from "lucide-react";
import { useState } from "react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { CashSessionDetails } from "@/features/cash-register/components/cash-session-details";
import { CloseCashRegisterDialog } from "@/features/cash-register/components/close-cash-register-dialog";
import { useOpenCashSessionQuery } from "@/features/cash-register/hooks/use-open-cash-session-query";
import type { CashMovementKind } from "@/features/cash-register/types";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { cn } from "@/lib/utils";
import { CashMovementDialog } from "./cash-movement-dialog";

type CashRegisterPanelProps = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
  onOpenRegister: () => void;
};

type CashDialogState =
  | { step: "closed" }
  | { step: "summary" }
  | { step: "movement"; kind: CashMovementKind }
  | { step: "close-register" };

export function CashRegisterPanel({
  organizationId,
  ticketBusiness,
  onOpenRegister,
}: CashRegisterPanelProps) {
  const cashSessionQuery = useOpenCashSessionQuery(organizationId);
  const [dialogState, setDialogState] = useState<CashDialogState>({
    step: "closed",
  });
  const summary = cashSessionQuery.data ?? null;
  const isLoaded = cashSessionQuery.isSuccess;
  const isRegisterOpen = summary !== null;

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
          isRegisterOpen
            ? setDialogState({ step: "summary" })
            : onOpenRegister()
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
