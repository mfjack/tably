"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type DataTableFilterOption<TValue extends string> = {
  value: TValue;
  label: string;
  count?: number;
};

export function getCountedFilterOptions<TValue extends string>(
  filters: readonly { value: TValue; label: string }[],
  counts: Readonly<Record<TValue, number>>,
  allValue: TValue,
): DataTableFilterOption<TValue>[] {
  return filters
    .filter((filter) => counts[filter.value] > 0)
    .map((filter) => ({
      ...filter,
      count: filter.value === allValue ? undefined : counts[filter.value],
    }));
}

type DataTableFilterTabsProps<TValue extends string> = {
  label: string;
  options: readonly DataTableFilterOption<TValue>[];
  value: TValue;
  onValueChange: (value: TValue) => void;
};

export function DataTableFilterTabs<TValue extends string>({
  label,
  options,
  value,
  onValueChange,
}: DataTableFilterTabsProps<TValue>) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue: string) => {
        const option = options.find((item) => item.value === nextValue);
        if (option) onValueChange(option.value);
      }}
    >
      <TabsList aria-label={label} className="group-data-horizontal/tabs:h-10">
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value} className="px-4">
            {option.label}
            {option.count !== undefined && (
              <span className="text-muted-foreground tabular-nums">
                {option.count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
