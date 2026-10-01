"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, CircleCheck } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { NumberField } from "@/components/form/number-field";
import {
  PAYMENT_METHOD_VALUES,
  PAYMENT_METHODS,
} from "@/features/orders/payment-methods";
import type { PaymentMethod } from "@/features/orders/types";
import {
  getOperatorNames,
  getOperatorPayments,
  getOperatorReceipts,
  sumPaymentTotals,
} from "@/features/sales-report/report-metrics";
import type { SalesReport } from "@/features/sales-report/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReportFilterSelect } from "./report-filter-select";
import { ReportSection } from "./report-section";

const ALL_OPERATORS_VALUE = "all";
const CASH_TOLERANCE = 0.005;

const cashCountSchema = z.object({
  countedCash: z.number().min(0, "Não pode ser negativo.").optional(),
});

type CashCountInput = z.infer<typeof cashCountSchema>;

type CashClosingSectionProps = {
  report: SalesReport;
};

type CashDifference =
  | { status: "pending" }
  | { status: "balanced" }
  | { status: "over"; amount: number }
  | { status: "short"; amount: number };

function getCashDifference(
  expectedCash: number,
  countedCash: number | undefined,
): CashDifference {
  if (countedCash === undefined || Number.isNaN(countedCash)) {
    return { status: "pending" };
  }
  const difference = countedCash - expectedCash;
  if (Math.abs(difference) < CASH_TOLERANCE) return { status: "balanced" };
  return difference > 0
    ? { status: "over", amount: difference }
    : { status: "short", amount: -difference };
}

function formatOrderCount(orderCount: number) {
  return `${orderCount} ${orderCount === 1 ? "pedido" : "pedidos"}`;
}

type CashDifferenceMessageProps = {
  difference: CashDifference;
};

function CashDifferenceMessage({ difference }: CashDifferenceMessageProps) {
  if (difference.status === "pending") return null;

  const isShort = difference.status === "short";
  const Icon = isShort ? CircleAlert : CircleCheck;
  const message =
    difference.status === "balanced"
      ? "Caixa confere."
      : `${isShort ? "Falta de" : "Sobra de"} ${formatCurrency(difference.amount)}`;

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 font-medium text-xs",
        isShort ? "text-destructive" : "text-primary",
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {message}
    </p>
  );
}

type PaymentMethodTileProps = {
  method: PaymentMethod;
  revenue: number;
  orderCount: number;
  share: number;
  receivedFromAccounts: number;
  children?: ReactNode;
};

function PaymentMethodTile({
  method,
  revenue,
  orderCount,
  share,
  receivedFromAccounts,
  children,
}: PaymentMethodTileProps) {
  const { label, icon: Icon } = PAYMENT_METHODS[method];

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="font-medium text-sm">{label}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-xl tabular-nums tracking-[-0.01em]">
          {formatCurrency(revenue + receivedFromAccounts)}
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {method === "customer_account"
            ? `${formatOrderCount(orderCount)} a receber`
            : `${formatOrderCount(orderCount)} · ${formatPercent(share)}`}
        </span>
        {receivedFromAccounts > 0 && (
          <span className="text-muted-foreground text-xs tabular-nums">
            Inclui {formatCurrency(receivedFromAccounts)} de contas recebidas
          </span>
        )}
      </div>
      {children && (
        <div className="flex flex-col gap-2 border-t pt-3">{children}</div>
      )}
    </div>
  );
}

export function CashClosingSection({ report }: CashClosingSectionProps) {
  const [operatorFilter, setOperatorFilter] = useState(ALL_OPERATORS_VALUE);
  const form = useForm<CashCountInput>({
    resolver: zodResolver(cashCountSchema),
  });
  const countedCash = useWatch({ control: form.control, name: "countedCash" });

  const operatorOptions = [
    { value: ALL_OPERATORS_VALUE, label: "Todos os operadores" },
    ...getOperatorNames(report).map((operatorName) => ({
      value: operatorName,
      label: operatorName,
    })),
  ];
  const selectedOperator =
    operatorFilter === ALL_OPERATORS_VALUE ? null : operatorFilter;
  const payments = getOperatorPayments(report, selectedOperator);
  const receipts = getOperatorReceipts(report, selectedOperator);
  const total = sumPaymentTotals(payments);
  const expectedCash = payments.cash.revenue + receipts.cash.revenue;

  return (
    <ReportSection
      title="Fechamento de caixa"
      description="Confira o valor recebido por operador e forma de pagamento no período."
      actions={
        <ReportFilterSelect
          label="Operador"
          placeholder="Todos os operadores"
          options={operatorOptions}
          value={operatorFilter}
          onValueChange={(value) =>
            setOperatorFilter(value ?? ALL_OPERATORS_VALUE)
          }
        />
      }
    >
      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PAYMENT_METHOD_VALUES.map((method) => (
          <PaymentMethodTile
            key={method}
            method={method}
            revenue={payments[method].revenue}
            orderCount={payments[method].orderCount}
            receivedFromAccounts={receipts[method].revenue}
            share={
              total.revenue > 0 ? payments[method].revenue / total.revenue : 0
            }
          >
            {method === "cash" && (
              <>
                <NumberField
                  control={form.control}
                  name="countedCash"
                  label="Contado na gaveta"
                  format="currency"
                  placeholder="Informe o valor contado"
                  size="compact"
                />
                <div aria-live="polite" className="empty:hidden">
                  <CashDifferenceMessage
                    difference={getCashDifference(expectedCash, countedCash)}
                  />
                </div>
              </>
            )}
          </PaymentMethodTile>
        ))}
      </div>

      {operatorFilter !== ALL_OPERATORS_VALUE && (
        <p className="text-muted-foreground text-sm">
          Total de {operatorFilter}:{" "}
          <strong className="font-semibold text-foreground tabular-nums">
            {formatCurrency(total.revenue)}
          </strong>{" "}
          · {formatOrderCount(total.orderCount)}
        </p>
      )}
    </ReportSection>
  );
}
