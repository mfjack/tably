import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type OptionSelectOption = {
  value: string;
  label: string;
};

type OptionSelectProps = {
  label: string;
  placeholder: string;
  options: readonly OptionSelectOption[];
  value: string | null;
  className?: string;
  onValueChange: (value: string) => void;
};

export function OptionSelect({
  label,
  placeholder,
  options,
  value,
  className,
  onValueChange,
}: OptionSelectProps) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(nextValue) => {
        if (typeof nextValue === "string") onValueChange(nextValue);
      }}
    >
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-10 w-full rounded-lg bg-background pr-3 data-[size=default]:h-10",
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="rounded-lg">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="py-2">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
