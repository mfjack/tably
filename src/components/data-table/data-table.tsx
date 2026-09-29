"use client";

import type { RowData } from "@tanstack/react-table";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableSortableHeader } from "./data-table-sortable-header";
import type { DataTableInstance } from "./use-data-table";

const LOADING_ROW_COUNT = 5;

type DataTableProps<TData extends RowData> = {
  table: DataTableInstance<TData>;
  searchPlaceholder: string;
  isLoading?: boolean;
  errorMessage?: string;
  emptyState: ReactNode;
  toolbarActions?: ReactNode;
};

export function DataTable<TData extends RowData>({
  table,
  searchPlaceholder,
  isLoading = false,
  errorMessage,
  emptyState,
  toolbarActions,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;
  const hasData = table.getCoreRowModel().rows.length > 0;

  if (errorMessage) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (!isLoading && !hasData) return emptyState;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <InputGroup className="h-10 w-full rounded-lg sm:max-w-xs">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={table.state.globalFilter ?? ""}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
          />
        </InputGroup>
        {toolbarActions}
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/60">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-11 px-4">
                    {header.isPlaceholder ? null : (
                      <DataTableSortableHeader header={header}>
                        <table.FlexRender header={header} />
                      </DataTableSortableHeader>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: LOADING_ROW_COUNT }, (_, rowIndex) => (
                  <TableRow key={`loading-${rowIndex.toString()}`}>
                    <TableCell colSpan={columnCount} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3">
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum resultado para essa busca.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}
