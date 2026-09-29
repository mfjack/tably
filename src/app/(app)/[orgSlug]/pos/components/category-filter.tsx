"use client";

import type { CategoryId } from "@/features/categories/types";
import { cn } from "@/lib/utils";

export type CategoryFilterOption = {
  id: CategoryId | null;
  label: string;
  productCount: number;
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
              "flex h-10 items-center gap-2 rounded-[14px] border px-4 font-medium text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
              isSelected
                ? "border-foreground bg-foreground text-background"
                : "bg-background hover:bg-muted",
            )}
          >
            {option.label}
            <span
              className={cn(
                "text-xs tabular-nums",
                isSelected ? "text-background/70" : "text-muted-foreground",
              )}
            >
              {option.productCount}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
