import { useMemo } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import type { Ingredient } from "../types";
import { useIngredientsQuery } from "./use-ingredients-query";

const EMPTY_INGREDIENTS: Ingredient[] = [];

export function useIngredientsMap(organizationId: OrganizationId) {
  const ingredientsQuery = useIngredientsQuery(organizationId);
  const ingredients = ingredientsQuery.data ?? EMPTY_INGREDIENTS;

  const ingredientsById = useMemo<ReadonlyMap<string, Ingredient>>(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])),
    [ingredients],
  );

  return {
    ingredients,
    ingredientsById,
    isPending: ingredientsQuery.isPending,
    errorMessage: ingredientsQuery.error?.message,
  };
}
