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
  getPaymentMethodSurcharge,
  isCountedInRevenue,
  sumPaymentTotals,
} from "@/features/sales-report/report-metrics";
import type { SalesReport } from "@/features/sales-report/types";
import {
  formatCurrency,
  formatPercent,
  formatPrecisePercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";
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

const SHARE_COLOR_CLASS_NAMES = [
  "bg-chart-1",
  "bg-chart-3",
  "bg-chart-4",
] as const;

function getShareColorClassName(index: number) {
  return SHARE_COLOR_CLASS_NAMES[index % SHARE_COLOR_CLASS_NAMES.length];
}

function describePaymentMethod(
  method: PaymentMethod,
  orderCount: number,
  share: number,
) {
  if (method === "customer_account") {
    return `${formatOrderCount(orderCount)} · a receber`;
  }
  if (method === "cash") {
    return `${formatOrderCount(orderCount)} · fora do faturamento`;
  }
  return `${formatOrderCount(orderCount)} · ${formatPercent(share)}`;
}

type PaymentMethodRowProps = {
  method: PaymentMethod;
  amount: number;
  orderCount: number;
  share: number;
  receivedFromAccounts: number;
  fee: number;
  surcharge: number;
  feePercent: number;
  colorClassName: string | null;
};

function PaymentMethodRow({
  method,
  amount,
  orderCount,
  share,
  receivedFromAccounts,
  fee,
  surcharge,
  feePercent,
  colorClassName,
}: PaymentMethodRowProps) {
  const { label, icon: Icon } = PAYMENT_METHODS[method];

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon aria-hidden className="size-4" />
        {colorClassName && (
          <span
            aria-hidden
            className={cn(
              "absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card",
              colorClassName,
            )}
          />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2 font-medium text-sm">
          {label}
          {feePercent > 0 && (
            <span className="font-normal text-muted-foreground text-xs tabular-nums">
              Taxa {formatPrecisePercent(feePercent / 100)}
            </span>
          )}
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {describePaymentMethod(method, orderCount, share)}
          {receivedFromAccounts > 0 &&
            ` · inclui ${formatCurrency(receivedFromAccounts)} de contas`}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="font-semibold tabular-nums">
          {formatCurrency(amount)}
        </span>
        {fee > 0 && (
          <span className="text-muted-foreground text-xs tabular-nums">
            recebe {formatCurrency(amount + surcharge - fee)}
          </span>
        )}
      </div>
    </li>
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
  function getMethodAmount(method: PaymentMethod) {
    return payments[method].revenue + receipts[method].revenue;
  }
  const usedMethods = PAYMENT_METHOD_VALUES.filter(
    (method) => getMethodAmount(method) > 0,
  );
  const countedMethods = usedMethods.filter(isCountedInRevenue);
  const receivedTotal = countedMethods.reduce(
    (sum, method) => sum + getMethodAmount(method),
    0,
  );

  function getShare(method: PaymentMethod) {
    return receivedTotal > 0 && isCountedInRevenue(method)
      ? getMethodAmount(method) / receivedTotal
      : 0;
  }

  return (
    <ReportSection
      title="Recebido por forma de pagamento"
      description="Quanto entrou em cada forma de pagamento."
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
      {countedMethods.length > 0 && (
        <div
          role="img"
          aria-label="Participação de cada forma de pagamento no faturamento"
          className="flex h-2.5 overflow-hidden rounded-full bg-muted"
        >
          {countedMethods.map((method, index) => (
            <span
              key={method}
              className={getShareColorClassName(index)}
              style={{ width: `${getShare(method) * 100}%` }}
            />
          ))}
        </div>
      )}
      <ul className="flex flex-col divide-y">
        {usedMethods.map((method) => {
          const countedIndex = countedMethods.indexOf(method);
          return (
            <PaymentMethodRow
              key={method}
              method={method}
              amount={getMethodAmount(method)}
              orderCount={payments[method].orderCount}
              receivedFromAccounts={receipts[method].revenue}
              fee={selectedOperator ? 0 : getPaymentMethodFee(report, method)}
              surcharge={
                selectedOperator ? 0 : getPaymentMethodSurcharge(report, method)
              }
              feePercent={getPaymentMethodFeePercent(paymentFees, method)}
              share={getShare(method)}
              colorClassName={
                countedIndex >= 0 ? getShareColorClassName(countedIndex) : null
              }
            />
          );
        })}
      </ul>

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
