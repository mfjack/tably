"use client";

import { format } from "date-fns";
import { ChevronRight, Printer, Wallet } from "lucide-react";
import { useState } from "react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCashDifference } from "@/features/cash-register/cash-difference";
import { CashSessionDetails } from "@/features/cash-register/components/cash-session-details";
import { useCashSessionsQuery } from "@/features/cash-register/hooks/use-cash-sessions-query";
import { printCashClosing } from "@/features/cash-register/print-cash-closing";
import type {
  CashSessionId,
  CashSessionSummary,
} from "@/features/cash-register/types";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReportSection } from "./report-section";

const LOADING_ROW_COUNT = 2;

type CashSessionsSectionProps = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
  startDate: string;
  endDate: string;
};

function formatSessionTime(summary: CashSessionSummary) {
  const openedAt = new Date(summary.openedAt);
  const opened = format(openedAt, "dd/MM · HH:mm");
  if (!summary.closedAt) return opened;

  const closedAt = new Date(summary.closedAt);
  const isSameDay =
    format(openedAt, "yyyy-MM-dd") === format(closedAt, "yyyy-MM-dd");
  return `${opened} – ${format(closedAt, isSameDay ? "HH:mm" : "dd/MM HH:mm")}`;
}

function CashSessionStatus({ summary }: { summary: CashSessionSummary }) {
  if (!summary.closedAt) return <Badge>Aberto</Badge>;

  const difference = getCashDifference(summary);
  if (!difference || difference.status === "balanced") {
    return <Badge variant="secondary">Bateu</Badge>;
  }
  return (
    <Badge
      variant={difference.status === "short" ? "destructive" : "secondary"}
      className="tabular-nums"
    >
      {difference.label} {formatCurrency(difference.amount)}
    </Badge>
  );
}

export function CashSessionsSection({
  organizationId,
  ticketBusiness,
  startDate,
  endDate,
}: CashSessionsSectionProps) {
  const cashSessionsQuery = useCashSessionsQuery(
    organizationId,
    startDate,
    endDate,
  );
  const [selectedSessionId, setSelectedSessionId] =
    useState<CashSessionId | null>(null);
  const sessions = cashSessionsQuery.data ?? [];
  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null;

  return (
    <ReportSection
      title="Caixas"
      icon={Wallet}
      description="Caixas abertos no período, com o recebido, o esperado e o contado na gaveta."
    >
      {cashSessionsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: LOADING_ROW_COUNT }, (_, rowIndex) => (
            <Skeleton
              key={`cash-session-${rowIndex.toString()}`}
              className="h-16 rounded-xl"
            />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground text-sm">
          Nenhum caixa aberto nesse período.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => setSelectedSessionId(session.id)}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium text-sm tabular-nums">
                    {formatSessionTime(session)}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {session.orderCount}{" "}
                    {session.orderCount === 1 ? "venda" : "vendas"}
                    {session.closedByName
                      ? ` · fechado por ${session.closedByName}`
                      : ""}
                  </span>
                </div>
                <span className="hidden font-semibold text-sm tabular-nums sm:block">
                  {formatCurrency(session.receivedTotal)}
                </span>
                <CashSessionStatus summary={session} />
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <DetailsDialog
        isOpen={selectedSession !== null}
        onOpenChange={(isOpen) => !isOpen && setSelectedSessionId(null)}
        title="Caixa"
        footer={
          <>
            <Button
              variant="outline"
              className={cn(
                DIALOG_ACTION_BUTTON_CLASS_NAME,
                !selectedSession?.closedAt && "col-span-2",
              )}
              onClick={() => setSelectedSessionId(null)}
            >
              Fechar
            </Button>
            {selectedSession?.closedAt && (
              <Button
                className={DIALOG_ACTION_BUTTON_CLASS_NAME}
                onClick={() =>
                  printCashClosing(selectedSession, ticketBusiness)
                }
              >
                <Printer aria-hidden />
                Imprimir
              </Button>
            )}
          </>
        }
      >
        {selectedSession && <CashSessionDetails summary={selectedSession} />}
      </DetailsDialog>
    </ReportSection>
  );
}
