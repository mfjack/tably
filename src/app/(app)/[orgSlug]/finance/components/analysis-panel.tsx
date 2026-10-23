"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Info, TriangleAlert } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { StatCard } from "@/components/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildCashFlowProjection,
  PROJECTION_HORIZONS,
  type ProjectionHorizon,
} from "@/features/finance/analysis";
import { useFinancialAnalysisQuery } from "@/features/finance/hooks/use-financial-analysis-query";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency, formatDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CashFlowChart } from "./cash-flow-chart";

type AnalysisPanelProps = {
  organizationId: OrganizationId;
  monthKey: string;
};

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

  if (analysisQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{analysisQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data || !projection) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const hasProjectionBase =
    data.balanceToday !== 0 || data.averageDailySales > 0;
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
              Saldo de hoje, o que está agendado e a média de vendas dos últimos
              28 dias.
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
                {data.averageDailySales > 0
                  ? `Incluir média de vendas (${formatCurrency(data.averageDailySales)}/dia)`
                  : "Incluir média de vendas (sem vendas nos últimos 28 dias)"}
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

        {!hasProjectionBase && (
          <Alert>
            <Info aria-hidden />
            <AlertDescription>
              Ainda não há vendas para projetar o saldo. Informe o saldo inicial
              em Financeiro ou aguarde os primeiros dias de venda: a projeção
              aparece assim que houver dados.
            </AlertDescription>
          </Alert>
        )}

        {hasProjectionBase && projection.firstNegativeDate && (
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

        {hasProjectionBase && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard
              label="Saldo hoje"
              value={formatCurrency(data.balanceToday)}
              isAlert={data.balanceToday < 0}
            />
            <StatCard
              label="Menor saldo previsto"
              value={formatCurrency(projection.lowestPoint.balance)}
              detail={formatDayLabel(projection.lowestPoint.date)}
              isAlert={projection.lowestPoint.balance < 0}
            />
            <StatCard
              className="col-span-2 lg:col-span-1"
              label={`Saldo em ${horizon} dias`}
              value={formatCurrency(projection.endingBalance)}
              isAlert={projection.endingBalance < 0}
            />
          </div>
        )}

        {hasProjectionBase && (
          <div className="rounded-2xl border bg-card p-4">
            <CashFlowChart points={projection.points} />
          </div>
        )}

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
                        hasProjectionBase &&
                          point.balance < 0 &&
                          "text-destructive",
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
    </div>
  );
}
