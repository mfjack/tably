export type StockLinks = {
  productsHref: string | null;
  ingredientsHref: string | null;
};

export function buildStockSearchHref(baseHref: string, itemName: string) {
  return `${baseHref}?${new URLSearchParams({ search: itemName })}`;
}
