"use client";

import { ReceiptText } from "lucide-react";
import { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sortPaidEntriesLast } from "@/features/finance/entry-order";
import { useFinancialEntriesQuery } from "@/features/finance/hooks/use-financial-entries-query";
import type {
  FinancialEntry,
  FinancialEntryKind,
} from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useSearchParamState } from "@/hooks/use-search-param-state";
import { formatCurrency } from "@/lib/format";
import { ListEmptyState } from "../../components/list-empty-state";
import {
  DEFAULT_ENTRY_STATUS_FILTER,
  ENTRY_STATUS_FILTERS,
  type EntryStatusFilter,
  parseEntryStatusFilter,
} from "../finance-search-params";
import { EntryRow } from "./entry-row";

const LOADING_ROW_COUNT = 4;

type EntriesPanelProps = {
  organizationId: OrganizationId;
  kind: FinancialEntryKind;
  monthKey: string;
  onCreate: () => void;
  onPay: (entry: FinancialEntry, today: string) => void;
  onEdit: (entry: FinancialEntry) => void;
  onDelete: (entry: FinancialEntry) => void;
};

export function EntriesPanel({
  organizationId,
  kind,
  monthKey,
  onCreate,
  onPay,
  onEdit,
  onDelete,
}: EntriesPanelProps) {
  const [filter, setFilter] = useSearchParamState({
    key: "status",
    defaultValue: DEFAULT_ENTRY_STATUS_FILTER,
    parse: parseEntryStatusFilter,
  });
  const entriesQuery = useFinancialEntriesQuery(
    organizationId,
    kind,
    monthKey,
    filter,
  );
  const isExpense = kind === "expense";
  const page = entriesQuery.data;
  const total = useMemo(
    () =>
      (page?.entries ?? []).reduce(
        (sum, entry) => sum + (entry.paidAmount ?? entry.amount),
        0,
      ),
    [page],
  );

  function changeFilter(value: string) {
    const nextFilter = parseEntryStatusFilter(value);
    if (nextFilter) setFilter(nextFilter);
  }

  const filterLabels = {
    open: "Em aberto",
    paid: isExpense ? "Pagas no mês" : "Recebidas no mês",
  } as const satisfies Record<EntryStatusFilter, string>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={changeFilter}>
          <TabsList className="max-w-full justify-start overflow-x-auto group-data-horizontal/tabs:h-10">
            {ENTRY_STATUS_FILTERS.map((listFilter) => (
              <TabsTrigger key={listFilter} value={listFilter} className="px-3">
                {filterLabels[listFilter]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {page && page.entries.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {page.entries.length}{" "}
            {page.entries.length === 1 ? "lançamento" : "lançamentos"} ·{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatCurrency(total)}
            </span>
          </p>
        )}
      </div>

      {filter === "open" && (
        <p className="text-muted-foreground text-xs">
          Mostra o que vence no mês escolhido e, junto, o que já está atrasado.
        </p>
      )}

      {entriesQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>{entriesQuery.error.message}</AlertDescription>
        </Alert>
      ) : !page ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: LOADING_ROW_COUNT }, (_, index) => (
            <Skeleton
              key={`entry-loading-${index.toString()}`}
              className="h-16 rounded-xl"
            />
          ))}
        </div>
      ) : page.entries.length === 0 ? (
        <ListEmptyState
          icon={ReceiptText}
          title={
            filter === "open"
              ? isExpense
                ? "Nada a pagar"
                : "Nada a receber"
              : "Nenhum lançamento"
          }
          description={
            isExpense
              ? "Cadastre aluguel, contas de consumo, fornecedores e outras despesas. As fixas podem se repetir sozinhas."
              : "Cadastre valores a receber, como eventos e encomendas."
          }
          createLabel={isExpense ? "Nova despesa" : "Nova receita"}
          canCreate
          onCreate={onCreate}
        />
      ) : (
        <ul className="flex flex-col divide-y rounded-2xl border bg-card">
          {sortPaidEntriesLast(page.entries).map((entry) => (
            <EntryRow
              key={entry.id}
              organizationId={organizationId}
              entry={entry}
              today={page.today}
              onPay={(entryToPay) => onPay(entryToPay, page.today)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
