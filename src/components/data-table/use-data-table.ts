import {
  type ColumnDef,
  type ReactTable,
  type RowData,
  useTable,
} from "@tanstack/react-table";
import { useEffect } from "react";
import {
  type DataTableFeatures,
  dataTableFeatures,
} from "./data-table-features";

const DEFAULT_PAGE_SIZE = 20;

type UseDataTableOptions<TData extends RowData> = {
  data: TData[];
  columns: ColumnDef<DataTableFeatures, TData, unknown>[];
  getRowId: (row: TData) => string;
};

export type DataTableInstance<TData extends RowData> = ReactTable<
  DataTableFeatures,
  TData
>;

export function useDataTable<TData extends RowData>({
  data,
  columns,
  getRowId,
}: UseDataTableOptions<TData>): DataTableInstance<TData> {
  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    getRowId,
    globalFilterFn: "includesString",
    autoResetPageIndex: false,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
  });

  const pageCount = table.getPageCount();
  const pageIndex = table.state.pagination.pageIndex;

  useEffect(() => {
    if (pageCount > 0 && pageIndex >= pageCount) {
      table.setPageIndex(pageCount - 1);
    }
  }, [table, pageCount, pageIndex]);

  return table;
}
