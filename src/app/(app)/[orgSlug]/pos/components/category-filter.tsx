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
    <nav
      aria-label="Categorias"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0"
    >
      {options.map((option) => {
        const isSelected = option.id === selectedCategoryId;
        return (
          <button
            key={option.id ?? "all"}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg border px-3 font-medium text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
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
