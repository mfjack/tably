"use client";

import type { CategoryId } from "@/features/categories/types";
import { cn } from "@/lib/utils";

export type CategoryFilterOption = {
  id: CategoryId | null;
  label: string;
};

type CategoryFilterProps = {
  options: readonly CategoryFilterOption[];
  selectedCategoryId: CategoryId | null;
  onSelect: (categoryId: CategoryId | null) => void;
};

export function CategoryFilter({
  options,
  selectedCategoryId,
  onSelect,
}: CategoryFilterProps) {
  return (
    <nav aria-label="Categorias" className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = option.id === selectedCategoryId;
        return (
          <button
            key={option.id ?? "all"}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex h-9 items-center rounded-lg border px-3 font-medium text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
              isSelected
                ? "border-foreground bg-foreground text-background"
                : "bg-background hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </nav>
  );
}
