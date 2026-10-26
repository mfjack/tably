import type { CategoryId } from "@/features/categories/types";

export function buildMenuSectionAnchor(categoryId: CategoryId) {
  return `category-${categoryId}`;
}
