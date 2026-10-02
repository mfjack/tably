import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const PREVIEW_KPIS = [
  { label: "Faturamento", value: "$ 18.420,00", change: "+12%" },
  { label: "Pedidos", value: "612", change: "+8%" },
  { label: "Ticket médio", value: "$ 30,10", change: null },
  { label: "Lucro bruto", value: "$ 11.240,00", change: "CMV 39%" },
] as const;

const PREVIEW_DAYS = [
  { label: "Seg", value: 48 },
  { label: "Ter", value: 55 },
  { label: "Qua", value: 62 },
  { label: "Qui", value: 70 },
  { label: "Sex", value: 92 },
  { label: "Sáb", value: 100 },
  { label: "Dom", value: 84 },
] as const;

const PREVIEW_TOP_PRODUCTS = [
  { name: "Cappuccino", quantity: 184 },
  { name: "Pão de queijo", quantity: 162 },
  { name: "X-Burguer", quantity: 97 },
] as const;

export function ReportPreview() {
  return (
    <div className="flex h-full w-full flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-bold text-sm">Relatório</span>
          <span className="text-[0.625rem] text-muted-foreground">
            1 a 30 de setembro
          </span>
        </div>
        <span className="rounded-lg bg-primary px-2 py-1 text-[0.625rem] text-primary-foreground">
          Este mês
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PREVIEW_KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="flex flex-col gap-0.5 rounded-lg border bg-card p-2"
          >
            <span className="text-[0.5625rem] text-muted-foreground">
              {kpi.label}
            </span>
            <span className="truncate font-bold text-xs tabular-nums">
              {kpi.value}
            </span>
            {kpi.change && (
              <span
                className={cn(
                  "text-[0.5625rem]",
                  kpi.change.startsWith("+")
                    ? "font-medium text-emerald-600"
                    : "text-muted-foreground",
                )}
              >
                {kpi.change}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_8rem] gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <div className="flex min-h-0 flex-col gap-2 rounded-lg border bg-card p-2">
          <span className="font-semibold text-[0.625rem]">Vendas por dia</span>
          <div className="flex min-h-0 flex-1 items-end gap-1.5">
            {PREVIEW_DAYS.map((day) => (
              <div
                key={day.label}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${day.value}%` }}
                />
                <span className="text-[0.5625rem] text-muted-foreground">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-2">
          <span className="flex items-center gap-1 font-semibold text-[0.625rem]">
            <TrendingUp className="size-3" />
            Mais vendidos
          </span>
          {PREVIEW_TOP_PRODUCTS.map((product, index) => (
            <div
              key={product.name}
              className="flex items-center justify-between gap-1 text-[0.625rem]"
            >
              <span className="truncate">
                {index + 1}. {product.name}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {product.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
