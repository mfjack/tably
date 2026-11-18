"use client";

import { Package, TriangleAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { DataTableFilterTabs } from "@/components/data-table/data-table-filter-tabs";
import { DataTableRowActionButton } from "@/components/data-table/data-table-row-action-button";
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions";
import { ALERT_ROW_CLASS_NAME } from "@/components/data-table/data-table-row-styles";
import { useCountedRowFilter } from "@/components/data-table/use-counted-row-filter";
import { useDataTable } from "@/components/data-table/use-data-table";
import {
  OptionSelect,
  type OptionSelectOption,
} from "@/components/option-select";
import { Badge } from "@/components/ui/badge";
import type { Ingredient } from "@/features/ingredients/types";
import {
  getAvailableQuantity,
  getProductAvailability,
  type ProductAvailability,
} from "@/features/products/availability";
import { CostValue } from "@/features/products/components/cost-value";
import { MarginValue } from "@/features/products/components/margin-value";
import { ProductThumbnail } from "@/features/products/components/product-thumbnail";
import { getExpiredIngredientNames } from "@/features/products/expired-ingredients";
import {
  calculateProductPricing,
  type ProductPricing,
} from "@/features/products/pricing";
import type { Product } from "@/features/products/types";
import { formatCurrency } from "@/lib/format";
import { ProductStockCell } from "./product-stock-cell";

const EMPTY_PRODUCTS: Product[] = [];

const STOCK_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "low", label: "Estoque baixo" },
  { value: "out", label: "Esgotados" },
] as const;

type StockFilter = (typeof STOCK_FILTERS)[number]["value"];

const ALL_CATEGORIES = "all";
const WITHOUT_CATEGORY = "none";

function getCategoryFilterValue(product: Product): string {
  return product.categoryId ?? WITHOUT_CATEGORY;
}

function buildCategoryOptions(
  products: readonly Product[],
): OptionSelectOption[] {
  const labelsByValue = new Map<string, string>();
  for (const product of products) {
    labelsByValue.set(
      getCategoryFilterValue(product),
      product.categoryName ?? "Sem categoria",
    );
  }
  const categoryOptions = [...labelsByValue]
    .map(([value, label]) => ({ value, label }))
    .sort((first, second) => first.label.localeCompare(second.label, "pt-BR"));
  return [
    { value: ALL_CATEGORIES, label: "Todas as categorias" },
    ...categoryOptions,
  ];
}

type ProductRow = Product &
  Pick<ProductPricing, "costRatio" | "margin"> & {
    availability: ProductAvailability;
    availableQuantity: number;
    expiredIngredientNames: string[];
  };

const columnHelper = createDataTableColumnHelper<ProductRow>();

type ProductsTableProps = {
  products: Product[] | undefined;
  ingredientsById: ReadonlyMap<string, Ingredient>;
  isLoading: boolean;
  errorMessage?: string;
  canManage: boolean;
  emptyState: ReactNode;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onManageStock: (product: Product) => void;
};

function getProductRowId(product: ProductRow) {
  return product.id;
}

function getProductSearchText(product: ProductRow) {
  return [product.name, product.categoryName].filter(Boolean).join(" ");
}

function getStockFilter(product: ProductRow): StockFilter {
  if (
    product.expiredIngredientNames.length > 0 ||
    product.availability.status === "out"
  ) {
    return "out";
  }
  return product.availability.status === "low" ? "low" : "all";
}

function getExpiredRowClassName(product: ProductRow) {
  return product.expiredIngredientNames.length > 0
    ? ALERT_ROW_CLASS_NAME
    : undefined;
}

export function ProductsTable({
  products,
  ingredientsById,
  isLoading,
  errorMessage,
  canManage,
  emptyState,
  onEdit,
  onDelete,
  onManageStock,
}: ProductsTableProps) {
  const productRows = useMemo<ProductRow[]>(
    () =>
      (products ?? EMPTY_PRODUCTS).map((product) => {
        const { costRatio, margin } = calculateProductPricing(
          product.price,
          product.unitCost,
        );
        const availability = getProductAvailability(product, ingredientsById);
        return {
          ...product,
          costRatio,
          margin,
          availability,
          availableQuantity: getAvailableQuantity(availability),
          expiredIngredientNames: getExpiredIngredientNames(
            product,
            ingredientsById,
          ),
        };
      }),
    [products, ingredientsById],
  );
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const categoryOptions = useMemo(
    () => buildCategoryOptions(products ?? EMPTY_PRODUCTS),
    [products],
  );
  const categoryRows = useMemo(
    () =>
      categoryFilter === ALL_CATEGORIES
        ? productRows
        : productRows.filter(
            (product) => getCategoryFilterValue(product) === categoryFilter,
          ),
    [productRows, categoryFilter],
  );
  const { filteredRows: filteredProductRows, filterTabs } = useCountedRowFilter(
    {
      rows: categoryRows,
      filters: STOCK_FILTERS,
      allValue: "all",
      classify: getStockFilter,
    },
  );

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor(getProductSearchText, {
          id: "name",
          header: "Produto",
          cell: ({ row }) => (
            <div className="flex items-center gap-3">
              <ProductThumbnail
                imageUrl={row.original.imageUrl}
                productName={row.original.name}
              />
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 font-medium">
                  {row.original.name}
                  {row.original.expiredIngredientNames.length > 0 && (
                    <Badge
                      variant="destructive"
                      title={`Item vencido: ${row.original.expiredIngredientNames.join(", ")}`}
                    >
                      <TriangleAlert aria-hidden />
                      Item vencido
                    </Badge>
                  )}
                </span>
                {row.original.menuDescription && (
                  <span className="line-clamp-2 max-w-96 text-muted-foreground text-xs">
                    {row.original.menuDescription}
                  </span>
                )}
                <span className="text-muted-foreground text-xs">
                  {row.original.expiredIngredientNames.length > 0
                    ? `Vencido: ${row.original.expiredIngredientNames.join(", ")}`
                    : (row.original.categoryName ?? "Sem categoria")}
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
        columnHelper.accessor("availableQuantity", {
          header: "Estoque",
          enableGlobalFilter: false,
          cell: ({ row }) => (
            <ProductStockCell availability={row.original.availability} />
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
                  >
                    <DataTableRowActionButton
                      label="Estoque"
                      accessibleLabel={`Estoque de ${row.original.name}`}
                      icon={Package}
                      onClick={() => onManageStock(row.original)}
                    />
                  </DataTableRowActions>
                ),
              }),
            ]
          : []),
      ]),
    [canManage, onEdit, onDelete, onManageStock],
  );

  const searchParams = useSearchParams();
  const table = useDataTable({
    data: filteredProductRows,
    columns,
    getRowId: getProductRowId,
    initialSearch: searchParams.get("search") ?? undefined,
  });

  return (
    <DataTable
      getRowClassName={getExpiredRowClassName}
      table={table}
      isLoading={isLoading}
      errorMessage={errorMessage}
      searchPlaceholder="Buscar produto ou categoria"
      emptyState={emptyState}
      searchFilters={
        categoryOptions.length > 2 && (
          <OptionSelect
            label="Filtrar por categoria"
            placeholder="Todas as categorias"
            options={categoryOptions}
            value={categoryFilter}
            className="sm:w-56"
            onValueChange={setCategoryFilter}
          />
        )
      }
      toolbarActions={
        filterTabs && (
          <DataTableFilterTabs label="Filtrar por estoque" {...filterTabs} />
        )
      }
    />
  );
}
