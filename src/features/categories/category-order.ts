import type { Category, CategoryId } from "./types";

export type CategoryOrder = ReadonlyMap<CategoryId, number>;

export function buildCategoryOrder(
  categories: readonly Pick<Category, "id">[] | undefined,
): CategoryOrder {
  return new Map(
    (categories ?? []).map((category, index) => [category.id, index]),
  );
}

export function sortByCategoryOrder<TItem>(
  items: readonly TItem[],
  getCategoryId: (item: TItem) => CategoryId | null,
  categoryOrder: CategoryOrder,
): TItem[] {
  const lastPosition = categoryOrder.size;
  return items
    .map((item, index) => ({ item, index }))
    .sort((first, second) => {
      const firstCategoryId = getCategoryId(first.item);
      const secondCategoryId = getCategoryId(second.item);
      const firstPosition =
        (firstCategoryId && categoryOrder.get(firstCategoryId)) ?? lastPosition;
      const secondPosition =
        (secondCategoryId && categoryOrder.get(secondCategoryId)) ??
        lastPosition;
      return firstPosition - secondPosition || first.index - second.index;
    })
    .map(({ item }) => item);
}
