import type { Header, RowData } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import type { DataTableFeatures } from "./data-table-features";

const SORT_DIRECTION_LABELS = {
  asc: "crescente",
  desc: "decrescente",
} as const;

type DataTableSortableHeaderProps<TData extends RowData> = {
  header: Header<DataTableFeatures, TData, unknown>;
  children: ReactNode;
};

export function DataTableSortableHeader<TData extends RowData>({
  header,
  children,
}: DataTableSortableHeaderProps<TData>) {
  const { column } = header;

  if (!column.getCanSort()) return children;

  const sortDirection = column.getIsSorted();
  const SortIcon =
    sortDirection === "asc"
      ? ArrowUp
      : sortDirection === "desc"
        ? ArrowDown
        : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      aria-label={
        sortDirection
          ? `Ordenado em ordem ${SORT_DIRECTION_LABELS[sortDirection]}`
          : "Ordenar"
      }
      className="-mx-1 flex items-center gap-1.5 rounded-md px-1 font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      {children}
      <SortIcon
        className={sortDirection ? "size-3.5 text-foreground" : "size-3.5"}
        aria-hidden
      />
    </button>
  );
}
