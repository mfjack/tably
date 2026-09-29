"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Pencil, ReceiptText, Trash2 } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { DataTableRowActionButton } from "@/components/data-table/data-table-row-action-button";
import { useDataTable } from "@/components/data-table/use-data-table";
import { WhatsAppLink } from "@/components/whatsapp-link";
import type { Supplier } from "@/features/suppliers/types";
import { formatCurrency } from "@/lib/format";

const EMPTY_SUPPLIERS: Supplier[] = [];

const columnHelper = createDataTableColumnHelper<Supplier>();

type SuppliersTableProps = {
  suppliers: Supplier[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  canManage: boolean;
  emptyState: ReactNode;
  onOpenPurchases: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
};

function getSupplierRowId(supplier: Supplier) {
  return supplier.id;
}

export function SuppliersTable({
  suppliers,
  isLoading,
  errorMessage,
  canManage,
  emptyState,
  onOpenPurchases,
  onEdit,
  onDelete,
}: SuppliersTableProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Fornecedor",
          cell: ({ row }) => (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{row.original.name}</span>
              {row.original.suppliedItems && (
                <span className="truncate text-muted-foreground text-xs">
                  {row.original.suppliedItems}
                </span>
              )}
            </div>
          ),
        }),
        columnHelper.accessor((supplier) => supplier.phone ?? "", {
          id: "phone",
          header: "Telefone",
          enableSorting: false,
          cell: ({ row }) =>
            row.original.phone ? (
              <WhatsAppLink
                phone={row.original.phone}
                className="text-muted-foreground"
              />
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        }),
        columnHelper.accessor("totalSpent", {
          header: "Compras",
          enableGlobalFilter: false,
          cell: ({ row }) => (
            <span className="tabular-nums">
              {formatCurrency(row.original.totalSpent)}
              <span className="text-muted-foreground text-xs">
                {" "}
                · {row.original.entryCount}{" "}
                {row.original.entryCount === 1 ? "entrada" : "entradas"}
              </span>
            </span>
          ),
        }),
        columnHelper.accessor("lastEntryAt", {
          header: "Última compra",
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
              {row.original.purchaseUrl && (
                <DataTableRowActionButton
                  label="Abrir link de compra"
                  accessibleLabel={`Abrir link de compra de ${row.original.name}`}
                  icon={ExternalLink}
                  onClick={() =>
                    window.open(
                      row.original.purchaseUrl ?? "",
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                />
              )}
              <DataTableRowActionButton
                label="Ver compras"
                accessibleLabel={`Ver compras de ${row.original.name}`}
                icon={ReceiptText}
                onClick={() => onOpenPurchases(row.original)}
              />
              {canManage && (
                <>
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
                </>
              )}
            </div>
          ),
        }),
      ]),
    [canManage, onOpenPurchases, onEdit, onDelete],
  );

  const table = useDataTable({
    data: suppliers ?? EMPTY_SUPPLIERS,
    columns,
    getRowId: getSupplierRowId,
  });

  return (
    <DataTable
      table={table}
      searchPlaceholder="Buscar fornecedor"
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyState={emptyState}
    />
  );
}
