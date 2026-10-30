import { createOptionParser } from "@/lib/search-params";

const INGREDIENTS_TABS = ["supplies", "preparations"] as const;

export type IngredientsTab = (typeof INGREDIENTS_TABS)[number];

export const DEFAULT_INGREDIENTS_TAB = "supplies" satisfies IngredientsTab;

export const parseIngredientsTab = createOptionParser(INGREDIENTS_TABS);
