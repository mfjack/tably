import { format } from "date-fns";
import type { ReactNode } from "react";
import { InfoTooltip } from "@/components/info-tooltip";
import { getPaymentMethodLabel } from "@/features/orders/payment-methods";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getCashDifference } from "../cash-difference";
import { getNetPaymentAmount, sumPayments } from "../cash-payment-totals";
import type { CashMovementKind, CashSessionSummary } from "../types";

const MOVEMENT_LABELS = {
  withdrawal: "Sangria",
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

type CashSessionDetailsProps = {
  summary: CashSessionSummary;
};

export function CashSessionDetails({ summary }: CashSessionDetailsProps) {
  const difference = getCashDifference(summary);
  const totalSurcharge = sumPayments(summary.payments, "surcharge");
  const totalFee = sumPayments(summary.payments, "fee");
  const isClosed = summary.closedAt !== null;

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
                  <InfoTooltip
                    label={`Taxa e valor que cai de ${getPaymentMethodLabel(payment.method)}`}
                  >
                    Taxa {formatCurrency(payment.fee)} · cai{" "}
                    {formatCurrency(getNetPaymentAmount(payment))}
                  </InfoTooltip>
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
        {summary.movements.map((movement) => (
          <SummaryRow
            key={movement.id}
            label={`${MOVEMENT_LABELS[movement.kind]}${movement.note ? ` · ${movement.note}` : ""}`}
            value={`${movement.kind === "withdrawal" ? "− " : ""}${formatCurrency(movement.amount)}`}
          />
        ))}
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
    </div>
  );
}
