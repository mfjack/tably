"use client";

import { SearchInput } from "@/components/search-input";

type ProductSearchInputProps = {
  searchTerm: string;
  onSearchTermChange: (searchTerm: string) => void;
};

export function ProductSearchInput({
  searchTerm,
  onSearchTermChange,
}: ProductSearchInputProps) {
  return (
    <SearchInput
      label="Buscar produto"
      value={searchTerm}
      onValueChange={onSearchTermChange}
      className="bg-muted sm:w-80"
    />
  );
}
