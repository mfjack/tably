"use client";

import { ChevronDown, Download, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { StatCard } from "@/components/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIncomeStatementQuery } from "@/features/finance/hooks/use-income-statement-query";
import { buildIncomeStatement } from "@/features/finance/income-statement/build-income-statement";
import { exportIncomeStatementExcel } from "@/features/finance/income-statement/export-income-statement-excel";
import {
  BENCHMARK_TONES,
  getStatementSign,
  getVariation,
} from "@/features/finance/income-statement/statement-format";
import type {
  BreakEvenAnalysis,
  StatementLine,
} from "@/features/finance/income-statement/types";
import type { OrganizationId } from "@/features/organizations/types";
import { formatMonthLabel } from "@/features/time-clock/time-utils";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const UNCATEGORIZED_LABEL = "Sem categoria";

type IncomeStatementPanelProps = {
  organizationId: OrganizationId;
  businessName: string;
  monthKey: string;
};

function formatSignedAmount(line: StatementLine, amount: number): string {
  const sign = getStatementSign(line.kind);
  const prefix = sign === "minus" ? "− " : sign === "plus" ? "+ " : "";
  return `${prefix}${formatCurrency(amount)}`;
}

function formatShare(amount: number, revenue: number): string {
  return revenue > 0 ? formatPercent(amount / revenue) : "—";
}

function VariationBadge({ line }: { line: StatementLine }) {
  const variation = getVariation(line.amount, line.previousAmount);
  if (variation === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const isCost = line.kind === "deduction";
  const isImprovement = isCost ? variation <= 0 : variation >= 0;
  return (
    <span
      className={cn(
        "font-medium",
        isImprovement
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-destructive",
      )}
    >
      {variation > 0 ? "+" : ""}
      {formatPercent(variation)}
    </span>
  );
}

type StatementRowProps = {
  line: StatementLine;
  revenue: number;
};

function StatementRow({ line, revenue }: StatementRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isTotal = line.kind === "subtotal" || line.kind === "result";
  const hasDetails = line.details.length > 0;

  return (
    <li className={cn(isTotal && "bg-muted/40")}>
      <button
        type="button"
        disabled={!hasDetails}
        aria-expanded={hasDetails ? isExpanded : undefined}
        onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-2.5 text-left text-sm disabled:cursor-default sm:grid-cols-[minmax(0,1fr)_8rem_4.5rem_8rem_4.5rem]"
      >
        <span
          className={cn(
            "flex min-w-0 items-center gap-1.5",
            isTotal && "font-semibold",
          )}
        >
          {hasDetails && (
            <ChevronDown
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          )}
          <span className="truncate">{line.label}</span>
        </span>
        <span
          className={cn(
            "text-right tabular-nums",
            isTotal && "font-semibold",
            line.kind === "result" && line.amount < 0 && "text-destructive",
          )}
        >
          {formatSignedAmount(line, line.amount)}
        </span>
        <span className="hidden text-right text-muted-foreground tabular-nums sm:block">
          {formatShare(line.amount, revenue)}
        </span>
        <span className="hidden text-right text-muted-foreground tabular-nums sm:block">
          {formatSignedAmount(line, line.previousAmount)}
        </span>
        <span className="hidden text-right tabular-nums sm:block">
          <VariationBadge line={line} />
        </span>
      </button>
      {isExpanded && (
        <ul className="pb-2">
          {line.details.map((detail) => (
            <li
              key={detail.label}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 px-4 py-1 pl-10 text-muted-foreground text-xs sm:grid-cols-[minmax(0,1fr)_8rem_4.5rem_8rem_4.5rem]"
            >
              <span className="truncate">{detail.label}</span>
              <span className="text-right tabular-nums">
                {formatCurrency(detail.amount)}
              </span>
              <span className="hidden text-right tabular-nums sm:block">
                {formatShare(detail.amount, revenue)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function BreakEvenCard({
  breakEven,
  revenue,
}: {
  breakEven: BreakEvenAnalysis;
  revenue: number;
}) {
  const progress = Math.min(1, breakEven.progress ?? 0);
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-semibold">Ponto de equilíbrio</h3>
        <p className="text-muted-foreground text-sm">
          Quanto vender no mês para pagar todos os custos fixos.
        </p>
      </div>
      {breakEven.breakEvenRevenue === null ? (
        <p className="text-muted-foreground text-sm">
          {revenue === 0
            ? "Ainda não há vendas no mês para calcular a margem."
            : "Os custos variáveis estão maiores que as vendas. Revise preços, fichas técnicas e taxas."}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <span className="font-bold text-2xl tabular-nums tracking-tight">
              {formatCurrency(breakEven.breakEvenRevenue)}
            </span>
            <span className="text-muted-foreground text-xs">
              Cerca de {formatCurrency(breakEven.dailyTarget ?? 0)} por dia
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div
              role="progressbar"
              aria-label="Vendas do mês em relação ao ponto de equilíbrio"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-sm">
              Vendido até agora:{" "}
              <span className="font-semibold tabular-nums">
                {formatCurrency(revenue)}
              </span>{" "}
              ({formatPercent(breakEven.progress ?? 0)})
            </span>
          </div>
        </>
      )}
      <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-sm">
        <div className="flex flex-col">
          <dt className="text-muted-foreground text-xs">Custos fixos</dt>
          <dd className="font-medium tabular-nums">
            {formatCurrency(breakEven.fixedCosts)}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-muted-foreground text-xs">
            Margem de contribuição
          </dt>
          <dd className="font-medium tabular-nums">
            {breakEven.contributionMargin !== null
              ? formatPercent(breakEven.contributionMargin)
              : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function IncomeStatementPanel({
  organizationId,
  businessName,
  monthKey,
}: IncomeStatementPanelProps) {
  const statementQuery = useIncomeStatementQuery(organizationId, monthKey);
  const [isExporting, setIsExporting] = useState(false);
  const data = statementQuery.data;
  const statement = useMemo(
    () =>
      data ? buildIncomeStatement(data.current, data.previous, monthKey) : null,
    [data, monthKey],
  );

  if (statementQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{statementQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data || !statement) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const revenue = statement.grossRevenue;
  const netMargin = revenue > 0 ? statement.netIncome / revenue : null;
  const uncategorizedAmount =
    data.current.categories.find(
      (category) =>
        category.name === UNCATEGORIZED_LABEL && category.kind === "expense",
    )?.amount ?? 0;

  async function exportStatement() {
    if (!statement || !data) return;
    setIsExporting(true);
    try {
      await exportIncomeStatementExcel({
        businessName,
        monthLabel: formatMonthLabel(monthKey),
        previousMonthLabel: formatMonthLabel(data.previousMonthKey),
        monthKey,
        statement,
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Faturamento"
          value={formatCurrency(revenue)}
          detail={`${statement.orderCount} vendas`}
        />
        <StatCard
          label="Lucro líquido"
          value={formatCurrency(statement.netIncome)}
          detail={
            netMargin !== null
              ? `Margem de ${formatPercent(netMargin)}`
              : "Sem vendas no mês"
          }
          tone={statement.netIncome < 0 ? "bad" : "good"}
        />
        {statement.indicators.map((indicator) => (
          <StatCard
            key={indicator.id}
            label={indicator.label}
            value={
              indicator.percent !== null
                ? formatPercent(indicator.percent)
                : "—"
            }
            detail={`${formatCurrency(indicator.amount)} · ${indicator.target}`}
            tone={BENCHMARK_TONES[indicator.status]}
          />
        ))}
      </div>

      {uncategorizedAmount > 0 && (
        <Alert>
          <TriangleAlert aria-hidden />
          <AlertDescription>
            {formatCurrency(uncategorizedAmount)} em despesas estão sem
            categoria e entraram em "Administrativas e outras". Categorize as
            contas para a DRE e o CMO ficarem certos.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-semibold">
                DRE de {formatMonthLabel(monthKey).toLowerCase()}
              </h2>
              <p className="text-muted-foreground text-sm">
                Vendas pelo dia do recebimento; despesas pelo vencimento. Toque
                numa linha para ver o detalhe.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              isLoading={isExporting}
              onClick={() => void exportStatement()}
            >
              <Download aria-hidden />
              Baixar Excel
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="hidden grid-cols-[minmax(0,1fr)_8rem_4.5rem_8rem_4.5rem] gap-x-4 border-b bg-muted/40 px-4 py-2 text-muted-foreground text-xs sm:grid">
              <span />
              <span className="text-right">{formatMonthLabel(monthKey)}</span>
              <span className="text-right">% receita</span>
              <span className="text-right">
                {formatMonthLabel(data.previousMonthKey)}
              </span>
              <span className="text-right">Variação</span>
            </div>
            <ul className="divide-y">
              {statement.lines.map((line) => (
                <StatementRow key={line.id} line={line} revenue={revenue} />
              ))}
            </ul>
          </div>
          {statement.investments.amount > 0 && (
            <ul className="overflow-hidden rounded-2xl border bg-card">
              <StatementRow line={statement.investments} revenue={revenue} />
            </ul>
          )}
          <p className="text-muted-foreground text-xs">
            {statement.usesRecipeCost
              ? "O CMV vem das fichas técnicas dos produtos vendidos. As compras de insumos não entram de novo, para não contar duas vezes."
              : "Sem fichas técnicas com custo, o CMV usa as compras de insumos do mês."}
            {statement.itemsWithoutCost > 0 &&
              ` ${statement.itemsWithoutCost} ${statement.itemsWithoutCost === 1 ? "item vendido está" : "itens vendidos estão"} sem custo na ficha técnica.`}{" "}
            As taxas de cartão e Pix são calculadas das vendas; não lance essas
            taxas como despesa para não contar duas vezes.
          </p>
        </section>
        <BreakEvenCard breakEven={statement.breakEven} revenue={revenue} />
      </div>
    </div>
  );
}
