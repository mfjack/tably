import type { RowData } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataTableInstance } from "./use-data-table";

type DataTablePaginationProps<TData extends RowData> = {
  table: DataTableInstance<TData>;
};

export function DataTablePagination<TData extends RowData>({
  table,
}: DataTablePaginationProps<TData>) {
  const pageCount = table.getPageCount();
  const filteredRowCount = table.getFilteredRowModel().rows.length;

  if (pageCount <= 1) {
    return (
      <p className="text-muted-foreground text-sm">
        {filteredRowCount} {filteredRowCount === 1 ? "item" : "itens"}
      </p>
    );
  }

  return (
    <nav
      aria-label="Paginação"
      className="flex items-center justify-between gap-3"
    >
      <p className="text-muted-foreground text-sm">
        Página {table.state.pagination.pageIndex + 1} de {pageCount} ·{" "}
        {filteredRowCount} itens
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Página anterior"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Próxima página"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
