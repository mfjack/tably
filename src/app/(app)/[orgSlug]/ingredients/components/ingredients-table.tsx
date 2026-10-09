"use client";

import { type ReactNode, useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { useDataTable } from "@/components/data-table/use-data-table";
import { Badge } from "@/components/ui/badge";
import {
  getDisplayUnitCost,
  getUnitSymbol,
} from "@/features/ingredients/measure-units";
import {
  formatPackageCount,
  hasPackage,
  toPackageQuantity,
} from "@/features/ingredients/packages";
import type { Ingredient } from "@/features/ingredients/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { ExpiryCell } from "./expiry-cell";
import { IngredientRowActions } from "./ingredient-row-actions";
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
  onProduce: (ingredient: Ingredient) => void;
  onEditRecipe: (ingredient: Ingredient) => void;
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
  onProduce,
  onEditRecipe,
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
              <span className="flex items-center gap-2 font-medium">
                {row.original.name}
                {row.original.isPrepared && (
                  <Badge variant="secondary">Produzido</Badge>
                )}
              </span>
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
                {hasPackage(row.original) && row.original.currentStock > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {" "}
                    (
                    {formatPackageCount(
                      toPackageQuantity(
                        row.original,
                        row.original.currentStock,
                      ),
                      row.original.packageName,
                    )}
                    )
                  </span>
                )}
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
