import type { SelectOption } from "@/components/form/select-field";
import type { Category } from "@/features/categories/types";

export function buildCategoryOptions(
  categories: readonly Category[],
): SelectOption[] {
  return categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));
}
