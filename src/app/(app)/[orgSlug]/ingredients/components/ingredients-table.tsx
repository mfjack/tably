"use client";

import { type ReactNode, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import {
  DataTableFilterTabs,
  getCountedFilterOptions,
} from "@/components/data-table/data-table-filter-tabs";
import { ALERT_ROW_CLASS_NAME } from "@/components/data-table/data-table-row-styles";
import { useDataTable } from "@/components/data-table/use-data-table";
import { Badge } from "@/components/ui/badge";
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

function matchesExpiryFilter(ingredient: Ingredient, filter: ExpiryFilter) {
  return (
    filter === "all" || getExpiryStatus(ingredient.expiresAt).status === filter
  );
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
  onEditRecipe,
  onEdit,
  onDelete,
}: IngredientsTableProps) {
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");
  const allIngredients = ingredients ?? EMPTY_INGREDIENTS;
  const expiryCounts = useMemo(() => {
    const counts: Record<ExpiryFilter, number> = {
      all: allIngredients.length,
      expired: 0,
      expiring: 0,
    };
    for (const ingredient of allIngredients) {
      const { status } = getExpiryStatus(ingredient.expiresAt);
      if (status === "expired" || status === "expiring") counts[status] += 1;
    }
    return counts;
  }, [allIngredients]);
  const activeExpiryFilter =
    expiryCounts[expiryFilter] > 0 ? expiryFilter : "all";
  const hasExpiryAlerts = expiryCounts.expired + expiryCounts.expiring > 0;
  const filteredIngredients = useMemo(
    () =>
      allIngredients.filter((ingredient) =>
        matchesExpiryFilter(ingredient, activeExpiryFilter),
      ),
    [allIngredients, activeExpiryFilter],
  );

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Nome",
          cell: ({ row }) => (
            <div className="flex flex-col">
              <span className="flex items-center gap-2 font-medium">
                {row.original.name}
                {row.original.isPrepared && (
                  <Badge variant="secondary">Produzido</Badge>
                )}
              </span>
            </div>
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
              onEditRecipe={onEditRecipe}
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
      onEditRecipe,
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
        hasExpiryAlerts && (
          <DataTableFilterTabs
            label="Filtrar por validade"
            options={getCountedFilterOptions(
              EXPIRY_FILTERS,
              expiryCounts,
              "all",
            )}
            value={activeExpiryFilter}
            onValueChange={setExpiryFilter}
          />
        )
      }
    />
  );
}
