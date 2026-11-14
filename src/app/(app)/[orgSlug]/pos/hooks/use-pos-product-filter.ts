import { useCallback, useMemo, useState } from "react";
import {
  type CategoryOrder,
  sortByCategoryOrder,
} from "@/features/categories/category-order";
import type { Category, CategoryId } from "@/features/categories/types";
import type { ProductId } from "@/features/products/types";
import { includesSearch, normalizeText } from "@/lib/search";
import type { CategoryFilterOption } from "../components/category-filter";
import type { PosProduct } from "./use-pos-catalog";

type PosProductFilterOptions = {
  products: readonly PosProduct[];
  organizedProducts: readonly PosProduct[];
  categories: readonly Category[] | undefined;
  categoryOrder: CategoryOrder;
  isOrganizing: boolean;
  onStartOrganizing: () => void;
};

export function usePosProductFilter({
  products,
  organizedProducts,
  categories,
  categoryOrder,
  isOrganizing,
  onStartOrganizing,
}: PosProductFilterOptions) {
  const [searchTerm, setSearchTerm] = useState("");
  const [chosenCategoryId, setChosenCategoryId] = useState<CategoryId>();

  const categoryOptions = useMemo<CategoryFilterOption[]>(() => {
    const categoryIdsWithProducts = new Set<CategoryId>(
      products.flatMap((product) =>
        product.categoryId ? [product.categoryId] : [],
      ),
    );
    return (categories ?? [])
      .filter((category) => categoryIdsWithProducts.has(category.id))
      .map((category) => ({ id: category.id, label: category.name }));
  }, [categories, products]);

  const selectedCategoryId = chosenCategoryId ?? categoryOptions[0]?.id ?? null;
  const canDragProducts =
    selectedCategoryId !== null || categoryOptions.length === 0;

  const visibleProducts = useMemo(() => {
    const normalizedSearch = isOrganizing ? "" : normalizeText(searchTerm);
    const categoryFilterId = normalizedSearch ? null : selectedCategoryId;
    const filteredProducts = organizedProducts.filter(
      (product) =>
        (categoryFilterId === null ||
          product.categoryId === categoryFilterId) &&
        includesSearch(product.name, normalizedSearch),
    );
    return categoryFilterId === null
      ? sortByCategoryOrder(
          filteredProducts,
          (product) => product.categoryId,
          categoryOrder,
        )
      : filteredProducts;
  }, [
    organizedProducts,
    isOrganizing,
    searchTerm,
    selectedCategoryId,
    categoryOrder,
  ]);

  const startOrganizingFromProduct = useCallback(
    (productId: ProductId) => {
      const pressedProduct = products.find(
        (product) => product.id === productId,
      );
      if (pressedProduct?.categoryId) {
        setChosenCategoryId(pressedProduct.categoryId);
      }
      setSearchTerm("");
      onStartOrganizing();
    },
    [products, onStartOrganizing],
  );

  return {
    searchTerm,
    setSearchTerm,
    categoryOptions,
    selectedCategoryId,
    selectCategory: setChosenCategoryId,
    canDragProducts,
    visibleProducts,
    startOrganizingFromProduct,
  };
}
