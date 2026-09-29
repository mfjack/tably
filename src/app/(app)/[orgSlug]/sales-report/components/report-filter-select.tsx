"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ReportFilterOption = {
  value: string;
  label: string;
};

type ReportFilterSelectProps = {
  label: string;
  placeholder: string;
  options: readonly ReportFilterOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
};

export function ReportFilterSelect({
  label,
  placeholder,
  options,
  value,
  onValueChange,
}: ReportFilterSelectProps) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(nextValue) =>
        onValueChange(typeof nextValue === "string" ? nextValue : null)
      }
    >
      <SelectTrigger
        aria-label={label}
        className="h-10 w-full rounded-lg bg-background pr-3 sm:w-64 data-[size=default]:h-10"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        align="end"
        className="rounded-lg"
      >
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="py-2">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
