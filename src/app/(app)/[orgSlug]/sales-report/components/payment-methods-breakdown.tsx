import { PAYMENT_METHODS } from "@/features/orders/payment-methods";
import type { SalesByPaymentMethod } from "@/features/sales-report/types";
import { formatCurrency, formatPercent } from "@/lib/format";

type PaymentMethodsBreakdownProps = {
  payments: readonly SalesByPaymentMethod[];
  totalRevenue: number;
};

export function PaymentMethodsBreakdown({
  payments,
  totalRevenue,
}: PaymentMethodsBreakdownProps) {
  return (
    <ul className="flex flex-col gap-4">
      {payments.map((payment) => {
        const { label, icon: Icon } = PAYMENT_METHODS[payment.method];
        const share = totalRevenue > 0 ? payment.revenue / totalRevenue : 0;

        return (
          <li key={payment.method} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Icon aria-hidden className="size-4 text-muted-foreground" />
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground tabular-nums">
                {payment.orderCount}{" "}
                {payment.orderCount === 1 ? "pedido" : "pedidos"}
              </span>
              <span className="ml-auto font-semibold tabular-nums">
                {formatCurrency(payment.revenue)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${share * 100}%` }}
                />
              </div>
              <span className="w-12 text-right text-muted-foreground text-xs tabular-nums">
                {formatPercent(share)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
