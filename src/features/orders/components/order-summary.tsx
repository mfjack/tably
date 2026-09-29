import { formatCurrency } from "@/lib/format";

export type OrderSummaryLine = {
  productName: string;
  quantity: number;
  total: number;
};

export type OrderSummaryData = {
  customerName?: string;
  lines: readonly OrderSummaryLine[];
  takeawayFee: number;
  total: number;
};

type OrderSummaryProps = {
  summary: OrderSummaryData;
};

export function OrderSummary({ summary }: OrderSummaryProps) {
  return (
    <section aria-label="Resumo do pedido" className="flex flex-col gap-3">
      {summary.customerName && (
        <p className="text-muted-foreground text-sm">
          Cliente:{" "}
          <strong className="font-semibold text-foreground">
            {summary.customerName}
          </strong>
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {summary.lines.map((line) => (
          <li
            key={line.productName}
            className="flex items-baseline justify-between gap-4 text-sm"
          >
            <span className="min-w-0 truncate">
              <strong className="mr-1.5 font-semibold tabular-nums">
                {line.quantity}x
              </strong>
              {line.productName}
            </span>
            <span className="shrink-0 tabular-nums">
              {formatCurrency(line.total)}
            </span>
          </li>
        ))}
        {summary.takeawayFee > 0 && (
          <li className="flex items-baseline justify-between gap-4 text-muted-foreground text-sm">
            <span>Para levar</span>
            <span className="tabular-nums">
              {formatCurrency(summary.takeawayFee)}
            </span>
          </li>
        )}
      </ul>

      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="font-bold text-base">Total</span>
        <span className="font-bold text-lg tabular-nums">
          {formatCurrency(summary.total)}
        </span>
      </div>
    </section>
  );
}
