"use client";

import { type ReactNode, useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { DataTableFilterTabs } from "@/components/data-table/data-table-filter-tabs";
import { ALERT_ROW_CLASS_NAME } from "@/components/data-table/data-table-row-styles";
import { useCountedRowFilter } from "@/components/data-table/use-counted-row-filter";
import { useDataTable } from "@/components/data-table/use-data-table";
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import type { Ingredient } from "@/features/ingredients/types";
import { getExpiryStatus } from "@/lib/expiry";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { ExpiryCell } from "./expiry-cell";
import {
  type IngredientRowActionHandlers,
  IngredientRowActions,
} from "./ingredient-row-actions";
import { StockStatusBadge } from "./stock-status-badge";

const EMPTY_INGREDIENTS: Ingredient[] = [];

const EXPIRY_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "expired", label: "Vencidos" },
  { value: "expiring", label: "A vencer" },
] as const;

type ExpiryFilter = (typeof EXPIRY_FILTERS)[number]["value"];

function getExpiryFilter(ingredient: Ingredient): ExpiryFilter {
  const { status } = getExpiryStatus(ingredient.expiresAt);
  return status === "expired" || status === "expiring" ? status : "all";
}

const columnHelper = createDataTableColumnHelper<Ingredient>();

type IngredientsTableProps = IngredientRowActionHandlers & {
  ingredients: Ingredient[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  canManage: boolean;
  emptyState: ReactNode;
};

function getIngredientRowId(ingredient: Ingredient) {
  return ingredient.id;
}

function getExpiredRowClassName(ingredient: Ingredient) {
  return getExpiryStatus(ingredient.expiresAt).status === "expired"
    ? ALERT_ROW_CLASS_NAME
    : undefined;
}

export function IngredientsTable({
  ingredients,
  isLoading,
  errorMessage,
  canManage,
  emptyState,
  onStockEntry,
  onLoss,
  onPrintLabel,
  onProduce,
  onEdit,
  onDelete,
}: IngredientsTableProps) {
  const { filteredRows: filteredIngredients, filterTabs } = useCountedRowFilter(
    {
      rows: ingredients ?? EMPTY_INGREDIENTS,
      filters: EXPIRY_FILTERS,
      allValue: "all",
      classify: getExpiryFilter,
    },
  );

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Nome",
          cell: ({ getValue }) => (
            <span className="font-medium">{getValue()}</span>
          ),
        }),
        columnHelper.accessor("currentStock", {
          header: "Estoque",
          enableGlobalFilter: false,
          cell: ({ row }) => (
            <div className="flex items-center gap-2">
              <span className="tabular-nums">
                {formatQuantity(row.original.currentStock)}{" "}
                {getUnitSymbol(row.original.unit)}
              </span>
              <StockStatusBadge ingredient={row.original} />
            </div>
          ),
        }),
        columnHelper.accessor("unitCost", {
          header: "Valor em estoque",
          enableGlobalFilter: false,
          cell: ({ row }) => {
            const { unitCost, currentStock } = row.original;
            if (unitCost <= 0) {
              return (
                <span className="font-medium text-warning text-sm">
                  Sem custo
                </span>
              );
            }
            const stockValue = Math.max(currentStock, 0) * unitCost;
            return (
              <span className="tabular-nums">
                {stockValue > 0 ? formatCurrency(stockValue) : "—"}
              </span>
            );
          },
        }),
        columnHelper.accessor("expiresAt", {
          header: "Validade",
          enableGlobalFilter: false,
          cell: ({ getValue }) => <ExpiryCell expiresAt={getValue()} />,
        }),
        columnHelper.display({
          id: "actions",
          header: () => <span className="sr-only">Ações</span>,
          cell: ({ row }) => (
            <IngredientRowActions
              ingredient={row.original}
              canManage={canManage}
              onStockEntry={onStockEntry}
              onLoss={onLoss}
              onPrintLabel={onPrintLabel}
              onProduce={onProduce}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ),
        }),
      ]),
    [
      canManage,
      onStockEntry,
      onLoss,
      onPrintLabel,
      onProduce,
      onEdit,
      onDelete,
    ],
  );

  const table = useDataTable({
    data: filteredIngredients,
    columns,
    getRowId: getIngredientRowId,
  });

  return (
    <DataTable
      getRowClassName={getExpiredRowClassName}
      table={table}
      isLoading={isLoading}
      errorMessage={errorMessage}
      searchPlaceholder="Buscar insumo"
      emptyState={emptyState}
      toolbarActions={
        filterTabs && (
          <DataTableFilterTabs label="Filtrar por validade" {...filterTabs} />
        )
      }
    />
  );
}
