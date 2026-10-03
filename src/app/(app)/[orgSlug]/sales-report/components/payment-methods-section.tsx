"use client";

import { useState } from "react";
import {
  PAYMENT_METHOD_VALUES,
  PAYMENT_METHODS,
} from "@/features/orders/payment-methods";
import type { PaymentMethod } from "@/features/orders/types";
import { getPaymentMethodFeePercent } from "@/features/organizations/payment-fees";
import type { OrganizationPaymentFees } from "@/features/organizations/types";
import {
  getOperatorNames,
  getOperatorPayments,
  getOperatorReceipts,
  getPaymentMethodFee,
  sumPaymentTotals,
} from "@/features/sales-report/report-metrics";
import type { SalesReport } from "@/features/sales-report/types";
import {
  formatCurrency,
  formatPercent,
  formatPrecisePercent,
} from "@/lib/format";
import { ReportFilterSelect } from "./report-filter-select";
import { ReportSection } from "./report-section";

const ALL_OPERATORS_VALUE = "all";

type PaymentMethodsSectionProps = {
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
  feePercent: number;
};

function PaymentMethodTile({
  method,
  revenue,
  orderCount,
  share,
  receivedFromAccounts,
  fee,
  feePercent,
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
            Taxa {formatCurrency(fee)} · recebe {formatCurrency(revenue - fee)}
          </span>
        )}
        {receivedFromAccounts > 0 && (
          <span className="text-muted-foreground text-xs tabular-nums">
            Inclui {formatCurrency(receivedFromAccounts)} de contas recebidas
          </span>
        )}
      </div>
    </div>
  );
}

export function PaymentMethodsSection({
  report,
  paymentFees,
}: PaymentMethodsSectionProps) {
  const [operatorFilter, setOperatorFilter] = useState(ALL_OPERATORS_VALUE);

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

  return (
    <ReportSection
      title="Recebido por forma de pagamento"
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
            fee={selectedOperator ? 0 : getPaymentMethodFee(report, method)}
            feePercent={getPaymentMethodFeePercent(paymentFees, method)}
            share={
              total.revenue > 0 ? payments[method].revenue / total.revenue : 0
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
    </ReportSection>
  );
}
