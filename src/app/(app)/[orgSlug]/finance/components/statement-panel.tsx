"use client";

import { ArrowLeftRight, Landmark, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteFinancialTransferMutation } from "@/features/finance/hooks/use-delete-financial-transfer-mutation";
import { useFinancialStatementQuery } from "@/features/finance/hooks/use-financial-statement-query";
import type {
  FinancialAccount,
  FinancialAccountId,
  StatementLine,
} from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency, formatDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALL_ACCOUNTS_VALUE = "all";

type StatementPanelProps = {
  organizationId: OrganizationId;
  monthKey: string;
  accounts: readonly FinancialAccount[];
};

function groupByDate(lines: readonly StatementLine[]) {
  const groups = new Map<string, StatementLine[]>();
  for (const line of lines) {
    const group = groups.get(line.date) ?? [];
    group.push(line);
    groups.set(line.date, group);
  }
  return [...groups.entries()];
}

function formatSignedCurrency(value: number) {
  return value > 0 ? `+${formatCurrency(value)}` : formatCurrency(value);
}

export function StatementPanel({
  organizationId,
  monthKey,
  accounts,
}: StatementPanelProps) {
  const [accountId, setAccountId] = useState<FinancialAccountId | null>(null);
  const statementQuery = useFinancialStatementQuery(
    organizationId,
    monthKey,
    accountId,
  );
  const deleteTransferMutation =
    useDeleteFinancialTransferMutation(organizationId);
  const statement = statementQuery.data;
  const groups = useMemo(
    () => (statement ? groupByDate(statement.lines) : []),
    [statement],
  );
  const accountItems = useMemo(
    () => [
      { value: ALL_ACCOUNTS_VALUE, label: "Todas as contas" },
      ...accounts.map((account) => ({
        value: account.id,
        label: account.isArchived
          ? `${account.name} (arquivada)`
          : account.name,
      })),
    ],
    [accounts],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          items={accountItems}
          value={accountId ?? ALL_ACCOUNTS_VALUE}
          onValueChange={(value) =>
            setAccountId(
              !value || value === ALL_ACCOUNTS_VALUE
                ? null
                : (value as FinancialAccountId),
            )
          }
        >
          <SelectTrigger
            aria-label="Conta"
            className="h-10 w-full rounded-lg sm:w-60"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            {accountItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statement && (
          <p className="text-muted-foreground text-sm tabular-nums">
            Entradas{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(statement.income)}
            </span>{" "}
            · Saídas{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(statement.expense)}
            </span>{" "}
            · Resultado{" "}
            <span
              className={cn(
                "font-semibold text-foreground",
                statement.income - statement.expense < 0 && "text-destructive",
              )}
            >
              {formatSignedCurrency(statement.income - statement.expense)}
            </span>
          </p>
        )}
      </div>

      {statementQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>{statementQuery.error.message}</AlertDescription>
        </Alert>
      ) : !statement ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
          <Landmark aria-hidden className="size-6 text-muted-foreground" />
          <p className="font-medium text-sm">Nenhuma movimentação no mês</p>
          <p className="text-muted-foreground text-sm">
            O extrato mostra o que foi pago, recebido e transferido.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(([date, lines]) => (
            <section key={date} className="flex flex-col gap-2">
              <h3 className="font-semibold text-muted-foreground text-xs">
                {formatDateKey(date)}
              </h3>
              <ul className="flex flex-col divide-y rounded-2xl border bg-card">
                {lines.map((line) =>
                  line.type === "entry" ? (
                    <li
                      key={line.entry.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium text-sm">
                          {line.entry.description}
                        </span>
                        <span className="truncate text-muted-foreground text-xs">
                          {[line.entry.categoryName, line.entry.accountName]
                            .filter((detail) => detail !== null)
                            .join(" · ")}
                        </span>
                      </div>
                      <span className="font-semibold text-sm tabular-nums">
                        {formatSignedCurrency(line.signedAmount)}
                      </span>
                    </li>
                  ) : (
                    <li
                      key={line.transfer.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <ArrowLeftRight
                        aria-hidden
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium text-sm">
                          {line.transfer.fromAccountName} →{" "}
                          {line.transfer.toAccountName}
                        </span>
                        <span className="truncate text-muted-foreground text-xs">
                          Transferência
                          {line.transfer.notes
                            ? ` · ${line.transfer.notes}`
                            : ""}
                        </span>
                      </div>
                      <span className="font-semibold text-sm tabular-nums">
                        {line.signedAmount === 0
                          ? formatCurrency(line.transfer.amount)
                          : formatSignedCurrency(line.signedAmount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Excluir transferência"
                        className="text-destructive"
                        disabled={deleteTransferMutation.isPending}
                        onClick={() =>
                          deleteTransferMutation.mutate(line.transfer.id, {
                            onSuccess: () =>
                              toast.success("Transferência excluída."),
                            onError: (error) => toast.error(error.message),
                          })
                        }
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </li>
                  ),
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
