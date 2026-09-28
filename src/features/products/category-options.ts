import type { SelectOption } from "@/components/form/select-field";
import type { Category } from "@/features/categories/types";
import { NONE_SELECT_VALUE } from "@/lib/optional-select-value";

export function buildCategoryOptions(
  categories: readonly Category[],
): SelectOption[] {
  return [
    { value: NONE_SELECT_VALUE, label: "Sem categoria" },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];
}
