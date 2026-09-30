"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinancialOverviewQuery } from "@/features/finance/hooks/use-financial-overview-query";
import { ACCOUNT_KIND_LABELS } from "@/features/finance/labels";
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
  onOpenAccounts: () => void;
};

type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  isAlert?: boolean;
};

function StatCard({ label, value, detail, isAlert }: StatCardProps) {
  return (
    <article className="flex flex-col gap-1 rounded-2xl border bg-card p-4">
      <h3 className="text-muted-foreground text-xs">{label}</h3>
      <p
        className={cn(
          "font-bold text-xl tabular-nums tracking-tight",
          isAlert && "text-destructive",
        )}
      >
        {value}
      </p>
      {detail && <p className="text-muted-foreground text-xs">{detail}</p>}
    </article>
  );
}

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
  onOpenAccounts,
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

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Saldo hoje"
          value={formatCurrency(totalBalance)}
          detail={`Somando ${activeAccounts.length} ${activeAccounts.length === 1 ? "conta" : "contas"}`}
          isAlert={totalBalance < 0}
        />
        <StatCard
          label="Entradas no mês"
          value={formatCurrency(overview.periodIncome)}
          detail="Recebido de fato"
        />
        <StatCard
          label="Saídas no mês"
          value={formatCurrency(overview.periodExpense)}
          detail="Pago de fato"
        />
        <StatCard
          label="Resultado do mês"
          value={formatCurrency(monthResult)}
          detail="Entradas menos saídas"
          isAlert={monthResult < 0}
        />
        <StatCard
          label="A pagar atrasado"
          value={formatCurrency(overview.overduePayables.amount)}
          detail={describeTotals(overview.overduePayables, "Nada atrasado")}
          isAlert={overview.overduePayables.count > 0}
        />
        <StatCard
          label="A pagar em 7 dias"
          value={formatCurrency(overview.upcomingPayables.amount)}
          detail={describeTotals(overview.upcomingPayables, "Nada vencendo")}
        />
        <StatCard
          label="A receber atrasado"
          value={formatCurrency(overview.overdueReceivables.amount)}
          detail={describeTotals(overview.overdueReceivables, "Nada atrasado")}
          isAlert={overview.overdueReceivables.count > 0}
        />
        <StatCard
          label="A receber em 7 dias"
          value={formatCurrency(overview.upcomingReceivables.amount)}
          detail={describeTotals(overview.upcomingReceivables, "Nada previsto")}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Vencidas e próximos 30 dias</h2>
          {overview.upcoming.length === 0 ? (
            <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
              Nenhuma conta vencida ou vencendo nos próximos 30 dias.
            </p>
          ) : (
            <ul className="flex flex-col divide-y rounded-2xl border bg-card">
              {overview.upcoming.map((entry) => (
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

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Contas</h2>
            <Button variant="ghost" size="sm" onClick={onOpenAccounts}>
              Gerenciar
            </Button>
          </div>
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {activeAccounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-sm">
                    {account.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {ACCOUNT_KIND_LABELS[account.kind]}
                  </span>
                </div>
                <span
                  className={cn(
                    "font-semibold text-sm tabular-nums",
                    account.balance < 0 && "text-destructive",
                  )}
                >
                  {formatCurrency(account.balance)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
