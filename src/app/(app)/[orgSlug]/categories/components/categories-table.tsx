"use client";

import { type ReactNode, useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions";
import { useDataTable } from "@/components/data-table/use-data-table";
import type { Category } from "@/features/categories/types";

const EMPTY_CATEGORIES: Category[] = [];

const columnHelper = createDataTableColumnHelper<Category>();

type CategoriesTableProps = {
  categories: Category[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  canManage: boolean;
  emptyState: ReactNode;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

function getCategoryRowId(category: Category) {
  return category.id;
}

export function CategoriesTable({
  categories,
  isLoading,
  errorMessage,
  canManage,
  emptyState,
  onEdit,
  onDelete,
}: CategoriesTableProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Nome",
          cell: ({ getValue }) => (
            <span className="font-medium">{getValue()}</span>
          ),
        }),
        columnHelper.accessor("productCount", {
          header: "Produtos",
          enableGlobalFilter: false,
          cell: ({ getValue }) => (
            <span className="text-muted-foreground tabular-nums">
              {getValue()}
            </span>
          ),
        }),
        ...(canManage
          ? [
              columnHelper.display({
                id: "actions",
                header: () => <span className="sr-only">Ações</span>,
                cell: ({ row }) => (
                  <DataTableRowActions
                    itemLabel={row.original.name}
                    onEdit={() => onEdit(row.original)}
                    onDelete={() => onDelete(row.original)}
                  />
                ),
              }),
            ]
          : []),
      ]),
    [canManage, onEdit, onDelete],
  );

  const table = useDataTable({
    data: categories ?? EMPTY_CATEGORIES,
    columns,
    getRowId: getCategoryRowId,
  });

  return (
    <DataTable
      table={table}
      isLoading={isLoading}
      errorMessage={errorMessage}
      searchPlaceholder="Buscar categoria"
      emptyState={emptyState}
    />
  );
}
