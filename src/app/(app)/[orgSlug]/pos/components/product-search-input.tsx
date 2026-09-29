"use client";

import { Search } from "lucide-react";
import { useRef } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";

const FOCUS_SEARCH_SHORTCUT = "F2";

type ProductSearchInputProps = {
  searchTerm: string;
  onSearchTermChange: (searchTerm: string) => void;
};

export function ProductSearchInput({
  searchTerm,
  onSearchTermChange,
}: ProductSearchInputProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcut(FOCUS_SEARCH_SHORTCUT, () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  });

  return (
    <InputGroup className="h-11 w-64 rounded-[10px] bg-muted lg:w-80">
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        ref={searchInputRef}
        type="search"
        aria-label="Buscar produto"
        aria-keyshortcuts={FOCUS_SEARCH_SHORTCUT}
        placeholder="Buscar produto"
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
      />
      <InputGroupAddon align="inline-end">
        <Kbd className="border bg-background">{FOCUS_SEARCH_SHORTCUT}</Kbd>
      </InputGroupAddon>
    </InputGroup>
  );
}
