import { useMemo, useState } from "react";
import type { DataTableFilterOption } from "./data-table-filter-tabs";

type RowFilter<TValue extends string> = {
  value: TValue;
  label: string;
};

type UseCountedRowFilterOptions<TRow, TValue extends string> = {
  rows: TRow[];
  filters: readonly RowFilter<TValue>[];
  allValue: TValue;
  classify: (row: TRow) => TValue;
};

export type CountedRowFilterTabs<TValue extends string> = {
  options: DataTableFilterOption<TValue>[];
  value: TValue;
  onValueChange: (value: TValue) => void;
};

export function useCountedRowFilter<TRow, TValue extends string>({
  rows,
  filters,
  allValue,
  classify,
}: UseCountedRowFilterOptions<TRow, TValue>) {
  const [selectedValue, setSelectedValue] = useState<TValue>(allValue);
  const classifiedRows = useMemo(
    () => rows.map((row) => ({ row, value: classify(row) })),
    [rows, classify],
  );
  const counts = useMemo(() => {
    const countsByValue = new Map<TValue, number>([[allValue, rows.length]]);
    for (const { value } of classifiedRows) {
      if (value !== allValue) {
        countsByValue.set(value, (countsByValue.get(value) ?? 0) + 1);
      }
    }
    return countsByValue;
  }, [classifiedRows, allValue, rows.length]);
  const activeValue =
    (counts.get(selectedValue) ?? 0) > 0 ? selectedValue : allValue;
  const filteredRows = useMemo(
    () =>
      activeValue === allValue
        ? rows
        : classifiedRows
            .filter(({ value }) => value === activeValue)
            .map(({ row }) => row),
    [rows, classifiedRows, activeValue, allValue],
  );
  const options = filters
    .filter((filter) => (counts.get(filter.value) ?? 0) > 0)
    .map((filter) => ({
      ...filter,
      count: filter.value === allValue ? undefined : counts.get(filter.value),
    }));
  const filterTabs: CountedRowFilterTabs<TValue> | null =
    options.length > 1
      ? { options, value: activeValue, onValueChange: setSelectedValue }
      : null;

  return { filteredRows, filterTabs };
}
