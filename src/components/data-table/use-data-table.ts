import {
  type ColumnDef,
  type ReactTable,
  type RowData,
  useTable,
} from "@tanstack/react-table";
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
  return useTable({
    features: dataTableFeatures,
    data,
    columns,
    getRowId,
    globalFilterFn: "includesString",
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
  });
}
