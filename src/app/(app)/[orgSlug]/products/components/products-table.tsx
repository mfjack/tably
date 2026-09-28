"use client";

import { type ReactNode, useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions";
import { useDataTable } from "@/components/data-table/use-data-table";
import { Badge } from "@/components/ui/badge";
import { CostValue } from "@/features/products/components/cost-value";
import { MarginValue } from "@/features/products/components/margin-value";
import { ProductThumbnail } from "@/features/products/components/product-thumbnail";
import {
  calculateProductPricing,
  type ProductPricing,
} from "@/features/products/pricing";
import type { Product } from "@/features/products/types";
import { formatCurrency } from "@/lib/format";

const EMPTY_PRODUCTS: Product[] = [];

type ProductRow = Product & Pick<ProductPricing, "costRatio" | "margin">;

const columnHelper = createDataTableColumnHelper<ProductRow>();

type ProductsTableProps = {
  products: Product[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  canManage: boolean;
  emptyState: ReactNode;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

function getProductRowId(product: ProductRow) {
  return product.id;
}

export function ProductsTable({
  products,
  isLoading,
  errorMessage,
  canManage,
  emptyState,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  const productRows = useMemo<ProductRow[]>(
    () =>
      (products ?? EMPTY_PRODUCTS).map((product) => {
        const { costRatio, margin } = calculateProductPricing(
          product.price,
          product.unitCost,
        );
        return { ...product, costRatio, margin };
      }),
    [products],
  );

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Produto",
          cell: ({ row }) => (
            <div className="flex items-center gap-3">
              <ProductThumbnail
                imageUrl={row.original.imageUrl}
                productName={row.original.name}
              />
              <div className="flex flex-col">
                <span className="font-medium">{row.original.name}</span>
                <span className="text-muted-foreground text-xs">
                  {row.original.categoryName ?? "Sem categoria"}
                </span>
              </div>
            </div>
          ),
        }),
        columnHelper.accessor("price", {
          header: "Preço",
          enableGlobalFilter: false,
          cell: ({ getValue }) => (
            <span className="tabular-nums">{formatCurrency(getValue())}</span>
          ),
        }),
        columnHelper.accessor("unitCost", {
          header: "Custo (CMV)",
          enableGlobalFilter: false,
          cell: ({ row }) => (
            <CostValue
              cost={row.original.unitCost}
              costRatio={row.original.costRatio}
            />
          ),
        }),
        columnHelper.accessor("margin", {
          header: "Margem",
          enableGlobalFilter: false,
          cell: ({ getValue }) => <MarginValue margin={getValue()} />,
        }),
        columnHelper.accessor("isActive", {
          header: "Status",
          enableGlobalFilter: false,
          cell: ({ getValue }) =>
            getValue() ? (
              <Badge variant="secondary">Ativo</Badge>
            ) : (
              <Badge variant="outline">Inativo</Badge>
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
    data: productRows,
    columns,
    getRowId: getProductRowId,
  });

  return (
    <DataTable
      table={table}
      isLoading={isLoading}
      errorMessage={errorMessage}
      searchPlaceholder="Buscar produto"
      emptyState={emptyState}
    />
  );
}
