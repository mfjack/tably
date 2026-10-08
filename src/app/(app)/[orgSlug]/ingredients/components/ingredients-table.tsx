"use client";

import { PackageMinus, PackagePlus, Tag } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { DataTableRowActionButton } from "@/components/data-table/data-table-row-action-button";
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions";
import { useDataTable } from "@/components/data-table/use-data-table";
import {
  getDisplayUnitCost,
  getUnitSymbol,
} from "@/features/ingredients/measure-units";
import type { Ingredient } from "@/features/ingredients/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { ExpiryCell } from "./expiry-cell";
import { StockStatusBadge } from "./stock-status-badge";

const EMPTY_INGREDIENTS: Ingredient[] = [];

const columnHelper = createDataTableColumnHelper<Ingredient>();

type IngredientsTableProps = {
  ingredients: Ingredient[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  canManage: boolean;
  emptyState: ReactNode;
  onStockEntry: (ingredient: Ingredient) => void;
  onLoss: (ingredient: Ingredient) => void;
  onPrintLabel: (ingredient: Ingredient) => void;
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (ingredient: Ingredient) => void;
};

function getIngredientRowId(ingredient: Ingredient) {
  return ingredient.id;
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
  onEdit,
  onDelete,
}: IngredientsTableProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Nome",
          cell: ({ row }) => (
            <div className="flex flex-col">
              <span className="font-medium">{row.original.name}</span>
              {row.original.brand && (
                <span className="text-muted-foreground text-xs">
                  {row.original.brand}
                </span>
              )}
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
          header: "Custo",
          enableGlobalFilter: false,
          cell: ({ row }) => {
            const { unitCost, unit, currentStock } = row.original;
            const displayCost = getDisplayUnitCost(unitCost, unit);
            const stockValue = Math.max(currentStock, 0) * unitCost;
            return (
              <div className="flex flex-col tabular-nums">
                <span>
                  {formatCurrency(displayCost.amount)} / {displayCost.symbol}
                </span>
                {stockValue > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {formatCurrency(stockValue)} em estoque
                  </span>
                )}
              </div>
            );
          },
        }),
        columnHelper.accessor("expiresAt", {
          header: "Validade",
          enableGlobalFilter: false,
          cell: ({ getValue }) => <ExpiryCell expiresAt={getValue()} />,
        }),
        columnHelper.accessor("recipeCount", {
          header: "Produtos",
          enableGlobalFilter: false,
          cell: ({ getValue }) => (
            <span className="text-muted-foreground tabular-nums">
              {getValue()}
            </span>
          ),
        }),
        columnHelper.display({
          id: "actions",
          header: () => <span className="sr-only">Ações</span>,
          cell: ({ row }) => (
            <DataTableRowActions
              itemLabel={row.original.name}
              onEdit={canManage ? () => onEdit(row.original) : undefined}
              onDelete={canManage ? () => onDelete(row.original) : undefined}
            >
              {canManage && (
                <DataTableRowActionButton
                  label="Registrar entrada"
                  accessibleLabel={`Registrar entrada de ${row.original.name}`}
                  icon={PackagePlus}
                  onClick={() => onStockEntry(row.original)}
                />
              )}
              <DataTableRowActionButton
                label="Registrar perda"
                accessibleLabel={`Registrar perda de ${row.original.name}`}
                icon={PackageMinus}
                onClick={() => onLoss(row.original)}
              />
              <DataTableRowActionButton
                label="Imprimir etiqueta"
                accessibleLabel={`Imprimir etiqueta de ${row.original.name}`}
                icon={Tag}
                onClick={() => onPrintLabel(row.original)}
              />
            </DataTableRowActions>
          ),
        }),
      ]),
    [canManage, onStockEntry, onLoss, onPrintLabel, onEdit, onDelete],
  );

  const table = useDataTable({
    data: ingredients ?? EMPTY_INGREDIENTS,
    columns,
    getRowId: getIngredientRowId,
  });

  return (
    <DataTable
      table={table}
      isLoading={isLoading}
      errorMessage={errorMessage}
      searchPlaceholder="Buscar insumo"
      emptyState={emptyState}
    />
  );
}
