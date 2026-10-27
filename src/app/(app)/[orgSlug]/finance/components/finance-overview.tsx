"use client";

import { addBusinessDays, format, parseISO } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { StatCard } from "@/components/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinancialOverviewQuery } from "@/features/finance/hooks/use-financial-overview-query";
import type { EntryTotals, FinancialEntry } from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency, formatDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EntryRow } from "./entry-row";

type FinanceOverviewProps = {
  organizationId: OrganizationId;
  monthKey: string;
  onPay: (entry: FinancialEntry, today: string) => void;
  onEdit: (entry: FinancialEntry) => void;
  onDelete: (entry: FinancialEntry) => void;
};

function describeTotals(totals: EntryTotals, emptyLabel: string) {
  if (totals.count === 0) return emptyLabel;
  return `${totals.count} ${totals.count === 1 ? "conta" : "contas"}`;
}

function describePendingReceivables(
  lastExpectedOn: string | null,
  today: string,
): string {
  if (!lastExpectedOn) return "Nada para cair na conta";
  const nextBusinessDay = format(
    addBusinessDays(parseISO(today), 1),
    "yyyy-MM-dd",
  );
  return lastExpectedOn === nextBusinessDay
    ? "Cai na conta no próximo dia útil"
    : `Cai na conta até ${formatDateKey(lastExpectedOn).slice(0, 5)}`;
}

export function FinanceOverview({
  organizationId,
  monthKey,
  onPay,
  onEdit,
  onDelete,
}: FinanceOverviewProps) {
  const [isPaidListOpen, setIsPaidListOpen] = useState(false);
  const overviewQuery = useFinancialOverviewQuery(organizationId, monthKey);
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
  const monthResult = overview.periodIncome - overview.periodExpense;
  const openEntries = overview.monthEntries.filter((entry) => !entry.paidAt);
  const paidEntries = overview.monthEntries.filter((entry) => entry.paidAt);
  const currentMonthKey = overview.today.slice(0, 7);
  const isFutureMonth = monthKey > currentMonthKey;
  const isCurrentMonth = monthKey === currentMonthKey;

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          "grid gap-3",
          isFutureMonth ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        <StatCard
          label="Saldo hoje"
          value={formatCurrency(totalBalance)}
          detail="Saldo inicial + vendas recebidas + entradas − saídas"
          isAlert={totalBalance < 0}
        />
        <StatCard
          label="A receber"
          value={formatCurrency(overview.pendingReceivables.amount)}
          detail={describePendingReceivables(
            overview.pendingReceivables.lastExpectedOn,
            overview.today,
          )}
        />
        {!isFutureMonth && (
          <StatCard
            className="sm:col-span-2 lg:col-span-1"
            label="Resultado do mês"
            value={formatCurrency(monthResult)}
            detail={`Entrou ${formatCurrency(overview.periodIncome)} (vendas ${formatCurrency(overview.periodSales)}) · Saiu ${formatCurrency(overview.periodExpense)}`}
            isAlert={monthResult < 0}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          detail={describeTotals(overview.monthPayables, "Tudo pago")}
        />
        <StatCard
          className="col-span-2 sm:col-span-1"
          label="Contas fixas do mês"
          value={formatCurrency(overview.monthFixedExpenses.amount)}
          detail={
            overview.monthFixedExpenses.count === 0
              ? "Nenhuma conta fixa"
              : `${formatCurrency(overview.monthFixedExpenses.paidAmount)} pago · ${overview.monthFixedExpenses.openCount} em aberto`
          }
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Em aberto no mês</h2>
        {openEntries.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
            {overview.monthEntries.length === 0
              ? "Nenhuma conta com vencimento neste mês."
              : "Tudo pago neste mês."}
          </p>
        ) : (
          <EntryList
            organizationId={organizationId}
            entries={openEntries}
            today={overview.today}
            onPay={onPay}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
        {paidEntries.length > 0 && (
          <div className="flex flex-col gap-3">
            <Button
              variant="ghost"
              className="self-start text-muted-foreground"
              aria-expanded={isPaidListOpen}
              onClick={() => setIsPaidListOpen((isOpen) => !isOpen)}
            >
              Pagas no mês ({paidEntries.length})
              <ChevronDown
                aria-hidden
                className={cn(
                  "transition-transform",
                  isPaidListOpen && "rotate-180",
                )}
              />
            </Button>
            {isPaidListOpen && (
              <EntryList
                organizationId={organizationId}
                entries={paidEntries}
                today={overview.today}
                onPay={onPay}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )}
          </div>
        )}
      </section>
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
