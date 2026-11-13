import { format } from "date-fns";
import type { ReactNode } from "react";
import { InfoHint } from "@/components/info-hint";
import { getPaymentMethodLabel } from "@/features/orders/payment-methods";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getCashDifference } from "../cash-difference";
import { getNetPaymentAmount, sumPayments } from "../cash-payment-totals";
import type { CashMovementKind, CashSessionSummary } from "../types";

const MOVEMENT_LABELS = {
  withdrawal: "Retirada",
  supply: "Reforço",
} as const satisfies Record<CashMovementKind, string>;

const DATE_TIME_FORMAT = "dd/MM, HH:mm";

type SummaryRowProps = {
  label: string;
  value: string;
  info?: ReactNode;
  isStrong?: boolean;
  className?: string;
};

function SummaryRow({
  label,
  value,
  info,
  isStrong = false,
  className,
}: SummaryRowProps) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 text-sm",
        isStrong && "font-semibold text-base",
        className,
      )}
    >
      <span className={cn(!isStrong && !className && "text-muted-foreground")}>
        {label}
      </span>
      <span className="flex items-center gap-1 tabular-nums">
        {info}
        {value}
      </span>
    </div>
  );
}

function formatSessionPeriod(summary: CashSessionSummary) {
  const opened = `Aberto em ${format(new Date(summary.openedAt), DATE_TIME_FORMAT)}${
    summary.openedByName ? ` por ${summary.openedByName}` : ""
  }.`;
  if (!summary.closedAt) return opened;

  return `${opened} Fechado em ${format(new Date(summary.closedAt), DATE_TIME_FORMAT)}${
    summary.closedByName ? ` por ${summary.closedByName}` : ""
  }.`;
}

type StatementLine = {
  id: string;
  label: string;
  amount: number;
  createdAt: string;
  createdByName: string | null;
  isOutflow: boolean;
};

function buildStatementLines(summary: CashSessionSummary): StatementLine[] {
  return [
    ...summary.cashEntries.map((entry) => ({ ...entry, isOutflow: false })),
    ...summary.movements.map((movement) => ({
      id: movement.id,
      label: `${MOVEMENT_LABELS[movement.kind]}${movement.note ? ` · ${movement.note}` : ""}`,
      amount: movement.amount,
      createdAt: movement.createdAt,
      createdByName: movement.createdByName,
      isOutflow: movement.kind === "withdrawal",
    })),
  ].sort((first, second) => first.createdAt.localeCompare(second.createdAt));
}

type CashSessionDetailsProps = {
  summary: CashSessionSummary;
};

export function CashSessionDetails({ summary }: CashSessionDetailsProps) {
  const difference = getCashDifference(summary);
  const totalSurcharge = sumPayments(summary.payments, "surcharge");
  const totalFee = sumPayments(summary.payments, "fee");
  const isClosed = summary.closedAt !== null;
  const statementLines = buildStatementLines(summary);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted-foreground text-sm">
        {formatSessionPeriod(summary)}
      </p>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold text-sm">Recebido</h3>
        {summary.payments.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum pagamento.</p>
        ) : (
          summary.payments.map((payment) => (
            <SummaryRow
              key={payment.method}
              label={getPaymentMethodLabel(payment.method)}
              value={formatCurrency(payment.amount + payment.surcharge)}
              info={
                payment.fee > 0 && (
                  <InfoHint
                    label={`Taxa e valor que cai de ${getPaymentMethodLabel(payment.method)}`}
                  >
                    Taxa {formatCurrency(payment.fee)} · cai{" "}
                    {formatCurrency(getNetPaymentAmount(payment))}
                  </InfoHint>
                )
              }
            />
          ))
        )}
        <SummaryRow
          label={`Total (${summary.orderCount} ${summary.orderCount === 1 ? "venda" : "vendas"})`}
          value={formatCurrency(summary.receivedTotal + totalSurcharge)}
          isStrong
        />
        {totalFee > 0 && (
          <SummaryRow
            label="Vou receber, descontadas as taxas"
            value={formatCurrency(
              summary.receivedTotal + totalSurcharge - totalFee,
            )}
          />
        )}
      </section>

      <section className="flex flex-col gap-2 border-t pt-4">
        <h3 className="font-semibold text-sm">Dinheiro na gaveta</h3>
        <SummaryRow
          label="Troco inicial"
          value={formatCurrency(summary.openingAmount)}
        />
        <SummaryRow
          label={`Vendas em dinheiro (${summary.cashSalesCount})`}
          value={`+ ${formatCurrency(summary.cashSales)}`}
        />
        {summary.cashAccountPayments > 0 && (
          <SummaryRow
            label="Fiado recebido em dinheiro"
            value={`+ ${formatCurrency(summary.cashAccountPayments)}`}
          />
        )}
        <SummaryRow
          label="Reforços"
          value={`+ ${formatCurrency(summary.supplies)}`}
        />
        <SummaryRow
          label="Retiradas"
          value={`− ${formatCurrency(summary.withdrawals)}`}
        />
        <SummaryRow
          label={isClosed ? "Esperado" : "Esperado agora"}
          value={formatCurrency(summary.expectedCash)}
          isStrong
        />
        {difference && (
          <>
            <SummaryRow
              label="Contado"
              value={formatCurrency(summary.countedCash ?? 0)}
            />
            <SummaryRow
              label={difference.label}
              value={formatCurrency(difference.amount)}
              className={cn(
                "font-medium",
                difference.status === "short" && "text-destructive",
                difference.status === "over" && "text-primary",
              )}
            />
          </>
        )}
        {summary.closingNote && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">
            {summary.closingNote}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2 border-t pt-4">
        <h3 className="font-semibold text-sm">Movimentação em dinheiro</h3>
        {statementLines.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma movimentação em dinheiro.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {statementLines.map((line) => (
              <li
                key={line.id}
                className="flex items-start justify-between gap-4 py-2 text-sm"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{line.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(line.createdAt), "HH:mm")}
                    {line.createdByName ? ` · ${line.createdByName}` : ""}
                  </span>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-medium tabular-nums",
                    line.isOutflow && "text-destructive",
                  )}
                >
                  {line.isOutflow ? "−" : "+"} {formatCurrency(line.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
