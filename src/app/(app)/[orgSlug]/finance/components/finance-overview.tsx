"use client";

import { StatCard } from "@/components/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { sortPaidEntriesLast } from "@/features/finance/entry-order";
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

function describeTotals(totals: EntryTotals, emptyLabel: string) {
  if (totals.count === 0) return emptyLabel;
  return `${totals.count} ${totals.count === 1 ? "conta" : "contas"}`;
}

export function FinanceOverview({
  organizationId,
  monthKey,
  onPay,
  onEdit,
  onDelete,
}: FinanceOverviewProps) {
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
  const totalBalance = activeAccounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  );
  const monthResult = overview.periodIncome - overview.periodExpense;
  const currentMonthKey = overview.today.slice(0, 7);
  const isFutureMonth = monthKey > currentMonthKey;
  const isCurrentMonth = monthKey === currentMonthKey;

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          "grid gap-3",
          isFutureMonth ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
        )}
      >
        <StatCard
          label="Saldo hoje"
          value={formatCurrency(totalBalance)}
          detail="Saldo inicial + entradas − saídas"
          isAlert={totalBalance < 0}
        />
        {!isFutureMonth && (
          <StatCard
            label="Resultado do mês"
            value={formatCurrency(monthResult)}
            detail={`Entrou ${formatCurrency(overview.periodIncome)} · Saiu ${formatCurrency(overview.periodExpense)}`}
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
        <h2 className="font-semibold">Contas do mês</h2>
        {overview.monthEntries.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
            Nenhuma conta com vencimento neste mês.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {sortPaidEntriesLast(overview.monthEntries).map((entry) => (
              <EntryRow
                key={entry.id}
                organizationId={organizationId}
                entry={entry}
                today={overview.today}
                onPay={(entryToPay) => onPay(entryToPay, overview.today)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
