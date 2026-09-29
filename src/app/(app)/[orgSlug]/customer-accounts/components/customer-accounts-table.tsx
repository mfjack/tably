"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HandCoins, Pencil, ReceiptText, Trash2 } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { DataTableRowActionButton } from "@/components/data-table/data-table-row-action-button";
import { useDataTable } from "@/components/data-table/use-data-table";
import { Badge } from "@/components/ui/badge";
import type { CustomerAccount } from "@/features/customer-accounts/types";
import { formatCurrency } from "@/lib/format";
import { formatPhone } from "@/lib/masks";
import { cn } from "@/lib/utils";

const EMPTY_ACCOUNTS: CustomerAccount[] = [];

const columnHelper = createDataTableColumnHelper<CustomerAccount>();

type CustomerAccountsTableProps = {
  accounts: CustomerAccount[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  emptyState: ReactNode;
  onOpenStatement: (account: CustomerAccount) => void;
  onReceivePayment: (account: CustomerAccount) => void;
  onEdit: (account: CustomerAccount) => void;
  onDelete: (account: CustomerAccount) => void;
};

function getAccountRowId(account: CustomerAccount) {
  return account.id;
}

export function CustomerAccountsTable({
  accounts,
  isLoading,
  errorMessage,
  emptyState,
  onOpenStatement,
  onReceivePayment,
  onEdit,
  onDelete,
}: CustomerAccountsTableProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Cliente",
          cell: ({ row }) => (
            <div className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2 font-medium">
                <span className="truncate">{row.original.name}</span>
                {!row.original.isActive && (
                  <Badge variant="secondary">Inativa</Badge>
                )}
              </span>
              {row.original.phone && (
                <span className="text-muted-foreground text-xs">
                  {formatPhone(row.original.phone)}
                </span>
              )}
            </div>
          ),
        }),
        columnHelper.accessor("balance", {
          header: "Saldo devedor",
          enableGlobalFilter: false,
          cell: ({ getValue }) => (
            <span
              className={cn(
                "font-semibold tabular-nums",
                getValue() > 0 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {formatCurrency(getValue())}
            </span>
          ),
        }),
        columnHelper.accessor("creditLimit", {
          header: "Limite",
          enableGlobalFilter: false,
          cell: ({ getValue }) => {
            const creditLimit = getValue();
            return (
              <span className="text-muted-foreground tabular-nums">
                {creditLimit === null
                  ? "Sem limite"
                  : formatCurrency(creditLimit)}
              </span>
            );
          },
        }),
        columnHelper.accessor("lastEntryAt", {
          header: "Última movimentação",
          enableGlobalFilter: false,
          cell: ({ getValue }) => {
            const lastEntryAt = getValue();
            return (
              <span className="text-muted-foreground">
                {lastEntryAt
                  ? `há ${formatDistanceToNowStrict(new Date(lastEntryAt), { locale: ptBR })}`
                  : "—"}
              </span>
            );
          },
        }),
        columnHelper.display({
          id: "actions",
          header: () => <span className="sr-only">Ações</span>,
          cell: ({ row }) => (
            <div className="flex justify-end gap-2">
              {row.original.balance > 0 && (
                <DataTableRowActionButton
                  label="Receber pagamento"
                  accessibleLabel={`Receber pagamento de ${row.original.name}`}
                  icon={HandCoins}
                  onClick={() => onReceivePayment(row.original)}
                />
              )}
              <DataTableRowActionButton
                label="Ver extrato"
                accessibleLabel={`Ver extrato de ${row.original.name}`}
                icon={ReceiptText}
                onClick={() => onOpenStatement(row.original)}
              />
              <DataTableRowActionButton
                label="Editar"
                accessibleLabel={`Editar ${row.original.name}`}
                icon={Pencil}
                onClick={() => onEdit(row.original)}
              />
              <DataTableRowActionButton
                label="Excluir"
                accessibleLabel={`Excluir ${row.original.name}`}
                icon={Trash2}
                variant="destructive"
                onClick={() => onDelete(row.original)}
              />
            </div>
          ),
        }),
      ]),
    [onOpenStatement, onReceivePayment, onEdit, onDelete],
  );

  const table = useDataTable({
    data: accounts ?? EMPTY_ACCOUNTS,
    columns,
    getRowId: getAccountRowId,
  });

  return (
    <DataTable
      table={table}
      searchPlaceholder="Buscar cliente"
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyState={emptyState}
    />
  );
}
