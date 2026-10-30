"use client";

import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

export function SearchInput({
  label,
  value,
  onValueChange,
  className,
}: SearchInputProps) {
  return (
    <InputGroup className={cn("h-10 w-full rounded-lg", className)}>
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </InputGroup>
  );
}
