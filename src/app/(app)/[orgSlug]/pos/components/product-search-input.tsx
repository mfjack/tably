"use client";

import { Search } from "lucide-react";
import { useRef } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";

type ProductSearchInputProps = {
  searchTerm: string;
  onSearchTermChange: (searchTerm: string) => void;
};

export function ProductSearchInput({ searchTerm, onSearchTermChange }: ProductSearchInputProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <InputGroup className="h-10 w-full rounded-lg bg-muted sm:w-80">
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        ref={searchInputRef}
        type="search"
        aria-label="Buscar produto"
        placeholder="Buscar produto"
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
      />
    </InputGroup>
  );
}
