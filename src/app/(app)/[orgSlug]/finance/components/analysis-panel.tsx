"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TriangleAlert } from "lucide-react";
import { type ReactNode, useId, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildBreakEven,
  buildCashFlowProjection,
  buildIncomeStatement,
  PROJECTION_HORIZONS,
  type ProjectionHorizon,
} from "@/features/finance/analysis";
import { useFinancialAnalysisQuery } from "@/features/finance/hooks/use-financial-analysis-query";
import type { OrganizationId } from "@/features/organizations/types";
import { formatMonthLabel } from "@/features/time-clock/time-utils";
import { formatCurrency, formatDateKey, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CashFlowChart } from "./cash-flow-chart";

type AnalysisPanelProps = {
  organizationId: OrganizationId;
  monthKey: string;
};

type StatProps = {
  label: string;
  value: string;
  detail?: string;
  isAlert?: boolean;
};

function Stat({ label, value, detail, isAlert }: StatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={cn(
          "font-bold text-xl tabular-nums tracking-tight",
          isAlert && "text-destructive",
        )}
      >
        {value}
      </span>
      {detail && (
        <span className="text-muted-foreground text-xs">{detail}</span>
      )}
    </div>
  );
}

type StatementRowProps = {
  label: ReactNode;
  value: number;
  sign?: "plus" | "minus";
  isTotal?: boolean;
  isIndented?: boolean;
};

function StatementRow({
  label,
  value,
  sign,
  isTotal,
  isIndented,
}: StatementRowProps) {
  const prefix = sign === "minus" ? "− " : sign === "plus" ? "+ " : "";
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-2.5 text-sm",
        isTotal && "bg-muted/40 font-semibold",
        isIndented && "pl-8 text-muted-foreground",
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          isTotal && value < 0 && "text-destructive",
        )}
      >
        {prefix}
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function formatDayLabel(date: string) {
  return format(parseISO(date), "EEE dd/MM", { locale: ptBR });
}

export function AnalysisPanel({
  organizationId,
  monthKey,
}: AnalysisPanelProps) {
  const [horizon, setHorizon] = useState<ProjectionHorizon>(30);
  const [includesExpectedSales, setIncludesExpectedSales] = useState(true);
  const salesSwitchId = useId();
  const analysisQuery = useFinancialAnalysisQuery(
    organizationId,
    monthKey,
    horizon,
  );
  const data = analysisQuery.data;

  const projection = useMemo(
    () =>
      data
        ? buildCashFlowProjection(data, horizon, includesExpectedSales)
        : null,
    [data, horizon, includesExpectedSales],
  );
  const statement = useMemo(
    () => (data ? buildIncomeStatement(data) : null),
    [data],
  );
  const breakEven = useMemo(
    () =>
      data && statement ? buildBreakEven(statement, data, monthKey) : null,
    [data, statement, monthKey],
  );

  if (analysisQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{analysisQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data || !projection || !statement || !breakEven) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const movementDays = projection.points.filter(
    (point) => point.inflow > 0 || point.outflow > 0,
  );
  const scheduledMovementDays = movementDays.filter(
    (point, index) =>
      index === 0 ||
      !includesExpectedSales ||
      point.outflow > 0 ||
      point.inflow > data.averageDailySales,
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold">Fluxo de caixa projetado</h2>
            <p className="text-muted-foreground text-sm">
              Saldo de hoje mais o que está agendado para entrar e sair.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id={salesSwitchId}
                checked={includesExpectedSales}
                onCheckedChange={setIncludesExpectedSales}
              />
              <Label htmlFor={salesSwitchId} className="text-sm">
                Incluir média de vendas (
                {formatCurrency(data.averageDailySales)}
                /dia)
              </Label>
            </div>
            <Tabs
              value={String(horizon)}
              onValueChange={(value: string) => {
                const nextHorizon = PROJECTION_HORIZONS.find(
                  (option) => String(option) === value,
                );
                if (nextHorizon) setHorizon(nextHorizon);
              }}
            >
              <TabsList className="group-data-horizontal/tabs:h-9">
                {PROJECTION_HORIZONS.map((option) => (
                  <TabsTrigger
                    key={option}
                    value={String(option)}
                    className="px-3"
                  >
                    {option} dias
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {projection.firstNegativeDate && (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertDescription>
              O saldo fica negativo em{" "}
              <strong>{formatDateKey(projection.firstNegativeDate)}</strong>. O
              menor saldo previsto é{" "}
              <strong>{formatCurrency(projection.lowestPoint.balance)}</strong>{" "}
              em {formatDateKey(projection.lowestPoint.date)}. Antecipe
              recebimentos ou renegocie algum vencimento.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Saldo hoje"
            value={formatCurrency(data.balanceToday)}
            isAlert={data.balanceToday < 0}
          />
          <Stat
            label="Menor saldo previsto"
            value={formatCurrency(projection.lowestPoint.balance)}
            detail={formatDayLabel(projection.lowestPoint.date)}
            isAlert={projection.lowestPoint.balance < 0}
          />
          <Stat
            label={`Saldo em ${horizon} dias`}
            value={formatCurrency(projection.endingBalance)}
            isAlert={projection.endingBalance < 0}
          />
          <Stat
            label="Atrasados contados hoje"
            value={formatCurrency(data.overdue.expense - data.overdue.income)}
            detail={`A pagar ${formatCurrency(data.overdue.expense)} · a receber ${formatCurrency(data.overdue.income)}`}
          />
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <CashFlowChart points={projection.points} />
        </div>

        {scheduledMovementDays.length > 0 && (
          <details className="rounded-2xl border bg-card">
            <summary className="cursor-pointer px-4 py-3 font-medium text-sm">
              Ver dias com contas agendadas ({scheduledMovementDays.length})
            </summary>
            <table className="w-full text-sm">
              <thead className="border-t bg-muted/40 text-muted-foreground text-xs">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Dia</th>
                  <th className="px-4 py-2 text-right font-medium">Entradas</th>
                  <th className="px-4 py-2 text-right font-medium">Saídas</th>
                  <th className="px-4 py-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t">
                {scheduledMovementDays.map((point) => (
                  <tr key={point.date}>
                    <td className="px-4 py-2">{formatDayLabel(point.date)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {point.inflow > 0 ? formatCurrency(point.inflow) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {point.outflow > 0 ? formatCurrency(point.outflow) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 text-right font-medium tabular-nums",
                        point.balance < 0 && "text-destructive",
                      )}
                    >
                      {formatCurrency(point.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold">
              Resultado de {formatMonthLabel(monthKey).toLowerCase()}
            </h2>
            <p className="text-muted-foreground text-sm">
              Vendas do mês menos custos e despesas com vencimento no mês.
            </p>
          </div>
          <div className="divide-y overflow-hidden rounded-2xl border bg-card">
            <StatementRow
              label={`Faturamento (${data.sales.orderCount} ${data.sales.orderCount === 1 ? "venda" : "vendas"})`}
              value={statement.revenue}
            />
            <StatementRow
              label="Taxas de cartão"
              value={statement.cardFees}
              sign="minus"
            />
            <StatementRow
              label={
                statement.goodsCostSource === "recipes"
                  ? "Custo dos produtos vendidos (fichas técnicas)"
                  : "Compras de insumos"
              }
              value={statement.goodsCost}
              sign="minus"
            />
            <StatementRow
              label="Lucro bruto"
              value={statement.grossProfit}
              isTotal
            />
            {statement.operatingExpenses.map((category) => (
              <StatementRow
                key={category.name}
                label={category.name}
                value={category.amount}
                sign="minus"
                isIndented
              />
            ))}
            <StatementRow
              label="Despesas do mês"
              value={statement.operatingExpensesTotal}
              sign="minus"
            />
            {statement.otherIncome > 0 && (
              <StatementRow
                label="Outras receitas"
                value={statement.otherIncome}
                sign="plus"
              />
            )}
            <StatementRow
              label={statement.result >= 0 ? "Lucro do mês" : "Prejuízo do mês"}
              value={statement.result}
              isTotal
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {statement.goodsCostSource === "recipes"
              ? "Compras de insumos não entram de novo aqui, porque o custo já está no CMV das fichas técnicas."
              : "Sem fichas técnicas com custo, o sistema usa as compras de insumos do mês como custo."}
            {data.sales.itemsWithoutCost > 0 &&
              ` ${data.sales.itemsWithoutCost} ${data.sales.itemsWithoutCost === 1 ? "item vendido está" : "itens vendidos estão"} sem custo na ficha técnica.`}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold">Ponto de equilíbrio</h2>
            <p className="text-muted-foreground text-sm">
              Quanto vender no mês para pagar todas as despesas fixas.
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
            {breakEven.breakEvenRevenue === null ? (
              <p className="text-muted-foreground text-sm">
                {statement.revenue === 0
                  ? "Ainda não há vendas no mês para calcular a margem. Assim que as vendas entrarem, o ponto de equilíbrio aparece aqui."
                  : "Os custos variáveis estão maiores que as vendas, então não existe ponto de equilíbrio com essa margem. Revise preços e fichas técnicas."}
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">
                    Precisa vender no mês
                  </span>
                  <span className="font-bold text-2xl tabular-nums tracking-tight">
                    {formatCurrency(breakEven.breakEvenRevenue)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Cerca de {formatCurrency(breakEven.dailyTarget ?? 0)} por
                    dia
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div
                    role="progressbar"
                    aria-label="Vendas do mês em relação ao ponto de equilíbrio"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(
                      Math.min(1, breakEven.progress ?? 0) * 100,
                    )}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(1, breakEven.progress ?? 0) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm">
                    Vendido até agora:{" "}
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(statement.revenue)}
                    </span>{" "}
                    ({formatPercent(breakEven.progress ?? 0)})
                  </span>
                </div>
              </>
            )}
            <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-sm">
              <div className="flex flex-col">
                <dt className="text-muted-foreground text-xs">
                  Despesas fixas
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(breakEven.fixedCosts)}
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-muted-foreground text-xs">
                  Margem de contribuição
                </dt>
                <dd className="font-medium tabular-nums">
                  {breakEven.contributionRatio !== null
                    ? formatPercent(breakEven.contributionRatio)
                    : "—"}
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-muted-foreground text-xs">Vendido hoje</dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(data.salesToday)}
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-muted-foreground text-xs">Meta do dia</dt>
                <dd className="font-medium tabular-nums">
                  {breakEven.dailyTarget !== null
                    ? formatCurrency(breakEven.dailyTarget)
                    : "—"}
                </dd>
              </div>
            </dl>
            <p className="text-muted-foreground text-xs">
              Margem de contribuição é o que sobra de cada venda depois do custo
              dos produtos, das embalagens e da taxa do cartão.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
