"use client";

import { Landmark } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePaymentReceivablesQuery } from "@/features/finance/hooks/use-payment-receivables-query";
import {
  type ReceivablesSummary,
  summarizeReceivables,
} from "@/features/finance/receivables";
import {
  PAYMENT_METHOD_VALUES,
  PAYMENT_METHODS,
} from "@/features/orders/payment-methods";
import type { PaymentMethod } from "@/features/orders/types";
import { getPaymentMethodFeePercent } from "@/features/organizations/payment-fees";
import type {
  OrganizationId,
  OrganizationPaymentFees,
} from "@/features/organizations/types";
import {
  getOperatorNames,
  getOperatorPayments,
  getOperatorReceipts,
  getPaymentMethodFee,
  getPaymentMethodSurcharge,
  sumPaymentTotals,
} from "@/features/sales-report/report-metrics";
import type { SalesReport } from "@/features/sales-report/types";
import {
  formatCurrency,
  formatPercent,
  formatPrecisePercent,
} from "@/lib/format";
import { ReceivableBadge } from "./receivable-badge";
import { ReceivablesDialog } from "./receivables-dialog";
import { ReportFilterSelect } from "./report-filter-select";
import { ReportSection } from "./report-section";

const ALL_OPERATORS_VALUE = "all";

type PaymentMethodsSectionProps = {
  organizationId: OrganizationId;
  report: SalesReport;
  paymentFees: OrganizationPaymentFees;
};

function formatOrderCount(orderCount: number) {
  return `${orderCount} ${orderCount === 1 ? "pedido" : "pedidos"}`;
}

type PaymentMethodTileProps = {
  method: PaymentMethod;
  revenue: number;
  orderCount: number;
  share: number;
  receivedFromAccounts: number;
  fee: number;
  surcharge: number;
  feePercent: number;
  receivablesSummary: ReceivablesSummary | null;
};

function PaymentMethodTile({
  method,
  revenue,
  orderCount,
  share,
  receivedFromAccounts,
  fee,
  surcharge,
  feePercent,
  receivablesSummary,
}: PaymentMethodTileProps) {
  const { label, icon: Icon } = PAYMENT_METHODS[method];

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="font-medium text-sm">{label}</span>
        {feePercent > 0 && (
          <span className="text-muted-foreground text-xs tabular-nums">
            Taxa {formatPrecisePercent(feePercent / 100)}
          </span>
        )}
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
        {fee > 0 && (
          <span className="text-muted-foreground text-xs tabular-nums">
            Taxa {formatCurrency(fee)} · recebe{" "}
            {formatCurrency(revenue + receivedFromAccounts + surcharge - fee)}
          </span>
        )}
        {receivedFromAccounts > 0 && (
          <span className="text-muted-foreground text-xs tabular-nums">
            Inclui {formatCurrency(receivedFromAccounts)} de contas recebidas
          </span>
        )}
      </div>
      {receivablesSummary && <ReceivableBadge summary={receivablesSummary} />}
    </div>
  );
}

export function PaymentMethodsSection({
  organizationId,
  report,
  paymentFees,
}: PaymentMethodsSectionProps) {
  const [operatorFilter, setOperatorFilter] = useState(ALL_OPERATORS_VALUE);
  const [isReceivablesOpen, setIsReceivablesOpen] = useState(false);
  const receivablesQuery = usePaymentReceivablesQuery(
    organizationId,
    report.startDate,
    report.endDate,
  );
  const receivables = receivablesQuery.data?.receivables ?? [];
  const today = receivablesQuery.data?.today ?? report.endDate;

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
  const receivedTotal = PAYMENT_METHOD_VALUES.filter(
    (method) => method !== "customer_account",
  ).reduce(
    (sum, method) => sum + payments[method].revenue + receipts[method].revenue,
    0,
  );
  const usedMethods = PAYMENT_METHOD_VALUES.filter(
    (method) => payments[method].revenue + receipts[method].revenue > 0,
  );

  function getMethodReceivablesSummary(method: PaymentMethod) {
    if (selectedOperator) return null;
    return summarizeReceivables(
      receivables.filter((receivable) => receivable.method === method),
      today,
    );
  }

  return (
    <ReportSection
      title="Recebido por forma de pagamento"
      description="Quanto entrou em cada forma de pagamento e se o cartão e o Pix já caíram na conta."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {receivables.length > 0 && (
            <Button
              variant="outline"
              className="h-10"
              onClick={() => setIsReceivablesOpen(true)}
            >
              <Landmark aria-hidden />
              Conferir recebimentos
            </Button>
          )}
          <ReportFilterSelect
            label="Operador"
            placeholder="Todos os operadores"
            options={operatorOptions}
            value={operatorFilter}
            onValueChange={(value) =>
              setOperatorFilter(value ?? ALL_OPERATORS_VALUE)
            }
          />
        </div>
      }
    >
      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {usedMethods.map((method) => (
          <PaymentMethodTile
            key={method}
            method={method}
            revenue={payments[method].revenue}
            orderCount={payments[method].orderCount}
            receivedFromAccounts={receipts[method].revenue}
            fee={selectedOperator ? 0 : getPaymentMethodFee(report, method)}
            surcharge={
              selectedOperator ? 0 : getPaymentMethodSurcharge(report, method)
            }
            feePercent={getPaymentMethodFeePercent(paymentFees, method)}
            receivablesSummary={getMethodReceivablesSummary(method)}
            share={
              receivedTotal > 0
                ? (payments[method].revenue + receipts[method].revenue) /
                  receivedTotal
                : 0
            }
          />
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

      <ReceivablesDialog
        organizationId={organizationId}
        isOpen={isReceivablesOpen}
        receivables={receivables}
        today={today}
        onClose={() => setIsReceivablesOpen(false)}
      />
    </ReportSection>
  );
}
