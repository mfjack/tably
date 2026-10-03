"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Gift, ReceiptText, SlidersHorizontal } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { DataTableRowActionButton } from "@/components/data-table/data-table-row-action-button";
import { useDataTable } from "@/components/data-table/use-data-table";
import { Badge } from "@/components/ui/badge";
import { WhatsAppLink } from "@/components/whatsapp-link";
import type { LoyaltyCustomer, LoyaltyProgram } from "@/features/loyalty/types";

const EMPTY_CUSTOMERS: LoyaltyCustomer[] = [];

const columnHelper = createDataTableColumnHelper<LoyaltyCustomer>();

type LoyaltyCustomersTableProps = {
  customers: LoyaltyCustomer[] | undefined;
  program: LoyaltyProgram;
  canManage: boolean;
  isLoading: boolean;
  errorMessage?: string;
  emptyState: ReactNode;
  onOpenHistory: (customer: LoyaltyCustomer) => void;
  onRedeem: (customer: LoyaltyCustomer) => void;
  onAdjust: (customer: LoyaltyCustomer) => void;
};

function getCustomerSearchText(customer: LoyaltyCustomer) {
  return `${customer.name} ${customer.phone}`;
}

function getCustomerRowId(customer: LoyaltyCustomer) {
  return customer.id;
}

export function LoyaltyCustomersTable({
  customers,
  program,
  canManage,
  isLoading,
  errorMessage,
  emptyState,
  onOpenHistory,
  onRedeem,
  onAdjust,
}: LoyaltyCustomersTableProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor(getCustomerSearchText, {
          id: "customer",
          header: "Cliente",
          cell: ({ row }) => (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{row.original.name}</span>
              <WhatsAppLink
                phone={row.original.phone}
                className="text-muted-foreground text-xs"
              />
            </div>
          ),
        }),
        columnHelper.accessor("balance", {
          header: "Selos",
          enableGlobalFilter: false,
          cell: ({ getValue }) => {
            const balance = getValue();
            return (
              <div className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">
                  {balance} de {program.stampsRequired}
                </span>
                {balance >= program.stampsRequired && (
                  <Badge variant="success">Prêmio disponível</Badge>
                )}
              </div>
            );
          },
        }),
        columnHelper.accessor("totalRedeemed", {
          header: "Prêmios",
          enableGlobalFilter: false,
          cell: ({ getValue }) => (
            <span className="text-muted-foreground tabular-nums">
              {getValue()}
            </span>
          ),
        }),
        columnHelper.accessor("lastVisitAt", {
          header: "Última visita",
          enableGlobalFilter: false,
          cell: ({ getValue }) => {
            const lastVisitAt = getValue();
            return (
              <span className="text-muted-foreground">
                {lastVisitAt
                  ? `há ${formatDistanceToNowStrict(new Date(lastVisitAt), { locale: ptBR })}`
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
              {row.original.balance >= program.stampsRequired && (
                <DataTableRowActionButton
                  label="Resgatar prêmio"
                  accessibleLabel={`Resgatar prêmio de ${row.original.name}`}
                  icon={Gift}
                  onClick={() => onRedeem(row.original)}
                />
              )}
              <DataTableRowActionButton
                label="Histórico"
                accessibleLabel={`Histórico de ${row.original.name}`}
                icon={ReceiptText}
                onClick={() => onOpenHistory(row.original)}
              />
              {canManage && (
                <DataTableRowActionButton
                  label="Ajustar selos"
                  accessibleLabel={`Ajustar selos de ${row.original.name}`}
                  icon={SlidersHorizontal}
                  onClick={() => onAdjust(row.original)}
                />
              )}
            </div>
          ),
        }),
      ]),
    [program.stampsRequired, canManage, onOpenHistory, onRedeem, onAdjust],
  );

  const table = useDataTable({
    data: customers ?? EMPTY_CUSTOMERS,
    columns,
    getRowId: getCustomerRowId,
  });

  return (
    <DataTable
      table={table}
      searchPlaceholder="Buscar por nome ou celular"
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyState={emptyState}
    />
  );
}
