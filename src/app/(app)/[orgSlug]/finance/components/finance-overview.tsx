"use client";

import { addDays, format, parseISO } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpenCashSessionQuery } from "@/features/cash-register/hooks/use-open-cash-session-query";
import { useFinancialOverviewQuery } from "@/features/finance/hooks/use-financial-overview-query";
import type { EntryTotals, FinancialEntry } from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EntryRow } from "./entry-row";

type FinanceOverviewProps = {
  organizationId: OrganizationId;
  monthKey: string;
  onPay: (entry: FinancialEntry, today: string) => void;
  onEdit: (entry: FinancialEntry) => void;
  onDelete: (entry: FinancialEntry) => void;
};

const DAYS_IN_WEEK = 7;
const ENTRY_GROUP_IDS = ["overdue", "this-week", "later"] as const;

type EntryGroupId = (typeof ENTRY_GROUP_IDS)[number];

const ENTRY_GROUP_TITLES = {
  overdue: "Atrasadas",
  "this-week": "Vencem nos próximos 7 dias",
  later: "Mais pra frente",
} as const satisfies Record<EntryGroupId, string>;

function describeTotals(totals: EntryTotals, emptyLabel: string) {
  if (totals.count === 0) return emptyLabel;
  return `${totals.count} ${totals.count === 1 ? "conta" : "contas"}`;
}

function getEntryGroupId(entry: FinancialEntry, today: string): EntryGroupId {
  if (entry.dueDate < today) return "overdue";
  const weekEnd = format(
    addDays(parseISO(today), DAYS_IN_WEEK - 1),
    "yyyy-MM-dd",
  );
  return entry.dueDate <= weekEnd ? "this-week" : "later";
}

function groupOpenEntries(entries: readonly FinancialEntry[], today: string) {
  return ENTRY_GROUP_IDS.map((id) => ({
    id,
    entries: entries.filter((entry) => getEntryGroupId(entry, today) === id),
  })).filter((group) => group.entries.length > 0);
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function matchesSearch(entry: FinancialEntry, normalizedSearch: string) {
  return [entry.description, entry.categoryName, entry.supplierName].some(
    (text) => text !== null && normalizeSearch(text).includes(normalizedSearch),
  );
}

function sumOpenAmounts(entries: readonly FinancialEntry[]) {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

function sumPaidAmounts(entries: readonly FinancialEntry[]) {
  return entries.reduce(
    (total, entry) => total + (entry.paidAmount ?? entry.amount),
    0,
  );
}

function getEmptyMessage(monthEntryCount: number, normalizedSearch: string) {
  if (normalizedSearch) return "Nenhuma conta encontrada.";
  return monthEntryCount === 0
    ? "Nenhuma conta com vencimento neste mês."
    : "Tudo pago neste mês.";
}

export function FinanceOverview({
  organizationId,
  monthKey,
  onPay,
  onEdit,
  onDelete,
}: FinanceOverviewProps) {
  const [isPaidListOpen, setIsPaidListOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const overviewQuery = useFinancialOverviewQuery(organizationId, monthKey);
  const cashSessionQuery = useOpenCashSessionQuery(organizationId);
  const overview = overviewQuery.data;

  if (overviewQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{overviewQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!overview) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const activeAccounts = overview.accounts.filter(
    (account) => !account.isArchived,
  );
  const totalBalance =
    overview.salesBalance +
    activeAccounts.reduce((sum, account) => sum + account.balance, 0);
  const normalizedSearch = normalizeSearch(searchTerm);
  const visibleEntries = normalizedSearch
    ? overview.monthEntries.filter((entry) =>
        matchesSearch(entry, normalizedSearch),
      )
    : overview.monthEntries;
  const openEntries = visibleEntries.filter((entry) => !entry.paidAt);
  const paidEntries = visibleEntries.filter((entry) => entry.paidAt);
  const openGroups = groupOpenEntries(openEntries, overview.today);
  const currentMonthKey = overview.today.slice(0, 7);
  const isFutureMonth = monthKey > currentMonthKey;
  const isCurrentMonth = monthKey === currentMonthKey;
  const expectedCash = cashSessionQuery.data?.expectedCash;
  const entryListProps = {
    organizationId,
    today: overview.today,
    onPay,
    onEdit,
    onDelete,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saldo hoje"
          value={formatCurrency(totalBalance)}
          detail={
            expectedCash === undefined
              ? "Sem o dinheiro do caixa"
              : `+ ${formatCurrency(expectedCash)} no caixa, à parte`
          }
          isAlert={totalBalance < 0}
        />
        {isFutureMonth ? (
          <StatCard
            label="Resultado do mês"
            value="—"
            detail="O mês ainda não começou"
          />
        ) : (
          <MonthResultCard
            income={overview.periodIncome}
            sales={overview.periodSales}
            expense={overview.periodExpense}
          />
        )}
        <StatCard
          label={
            isCurrentMonth
              ? "A pagar atrasado"
              : "Em aberto de meses anteriores"
          }
          value={formatCurrency(overview.overduePayables.amount)}
          detail={describeTotals(overview.overduePayables, "Nada atrasado")}
          isAlert={overview.overduePayables.count > 0}
        />
        <StatCard
          label="A pagar no mês"
          value={formatCurrency(overview.monthPayables.amount)}
          detail={[
            describeTotals(overview.monthPayables, "Tudo pago"),
            overview.monthFixedExpenses.count > 0
              ? `fixas ${formatCurrency(overview.monthFixedExpenses.amount)}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Contas do mês</h2>
          {overview.monthEntries.length > 0 && (
            <SearchInput
              label="Buscar conta, categoria ou fornecedor"
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="sm:max-w-sm"
            />
          )}
        </div>
        {openEntries.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
            {getEmptyMessage(overview.monthEntries.length, normalizedSearch)}
          </p>
        ) : (
          openGroups.map((group) => (
            <EntryGroup
              key={group.id}
              title={ENTRY_GROUP_TITLES[group.id]}
              entries={group.entries}
              isAlert={group.id === "overdue"}
              {...entryListProps}
            />
          ))
        )}
        {paidEntries.length > 0 && (
          <div className="flex flex-col gap-3">
            <Button
              variant="ghost"
              className="self-start text-muted-foreground"
              aria-expanded={isPaidListOpen}
              onClick={() => setIsPaidListOpen((isOpen) => !isOpen)}
            >
              Pagas no mês ({paidEntries.length}) ·{" "}
              {formatCurrency(sumPaidAmounts(paidEntries))}
              <ChevronDown
                aria-hidden
                className={cn(
                  "transition-transform",
                  isPaidListOpen && "rotate-180",
                )}
              />
            </Button>
            {isPaidListOpen && (
              <EntryList entries={paidEntries} {...entryListProps} />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

type MonthResultCardProps = {
  income: number;
  sales: number;
  expense: number;
};

function MonthResultCard({ income, sales, expense }: MonthResultCardProps) {
  const result = income - expense;
  const largestAmount = Math.max(income, expense, 1);

  return (
    <StatCard
      label="Resultado do mês"
      value={formatCurrency(result)}
      isAlert={result < 0}
      detail={
        <dl className="mt-1 flex flex-col gap-1.5">
          <ResultBar
            label="Entrou"
            amount={income}
            note={sales > 0 ? `vendas ${formatCurrency(sales)}` : undefined}
            widthPercent={(income / largestAmount) * 100}
            barClassName="bg-emerald-500"
          />
          <ResultBar
            label="Saiu"
            amount={expense}
            widthPercent={(expense / largestAmount) * 100}
            barClassName="bg-destructive"
          />
        </dl>
      }
    />
  );
}

type ResultBarProps = {
  label: string;
  amount: number;
  note?: string;
  widthPercent: number;
  barClassName: string;
};

function ResultBar({
  label,
  amount,
  note,
  widthPercent,
  barClassName,
}: ResultBarProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <dt>{label}</dt>
        <dd className="tabular-nums">
          {formatCurrency(amount)}
          {note && <span className="ml-1 opacity-70">({note})</span>}
        </dd>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", barClassName)}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}

type EntryListProps = Pick<
  FinanceOverviewProps,
  "organizationId" | "onPay" | "onEdit" | "onDelete"
> & {
  entries: FinancialEntry[];
  today: string;
};

type EntryGroupProps = EntryListProps & {
  title: string;
  isAlert: boolean;
};

function EntryGroup({
  title,
  isAlert,
  entries,
  ...listProps
}: EntryGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h3
          className={cn(
            "font-medium text-sm",
            isAlert ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {title} ({entries.length})
        </h3>
        <span
          className={cn(
            "font-semibold text-sm tabular-nums",
            isAlert && "text-destructive",
          )}
        >
          {formatCurrency(sumOpenAmounts(entries))}
        </span>
      </div>
      <EntryList entries={entries} {...listProps} />
    </div>
  );
}

function EntryList({
  organizationId,
  entries,
  today,
  onPay,
  onEdit,
  onDelete,
}: EntryListProps) {
  return (
    <ul className="flex flex-col divide-y rounded-2xl border bg-card">
      {entries.map((entry) => (
        <EntryRow
          key={entry.id}
          organizationId={organizationId}
          entry={entry}
          today={today}
          onPay={(entryToPay) => onPay(entryToPay, today)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
