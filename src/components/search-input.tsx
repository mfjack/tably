"use client";

import { Search, X } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
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
    <InputGroup
      className={cn(
        "h-10 w-full rounded-lg border-transparent bg-muted has-[[data-slot=input-group-control]:focus-visible]:border-ring/40 has-[[data-slot=input-group-control]:focus-visible]:ring-0",
        className,
      )}
    >
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="text-sm [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label="Limpar busca"
            onClick={() => onValueChange("")}
          >
            <X aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
