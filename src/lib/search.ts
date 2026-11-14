const SEARCH_LOCALE = "pt-BR";

export function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase(SEARCH_LOCALE);
}

export function includesSearch(
  text: string | null | undefined,
  normalizedSearch: string,
): boolean {
  return normalizeText(text ?? "").includes(normalizedSearch);
}

export function filterBySearch<TItem>(
  items: readonly TItem[],
  searchTerm: string,
  getSearchableTexts: (item: TItem) => readonly (string | null | undefined)[],
): readonly TItem[] {
  const normalizedSearch = normalizeText(searchTerm);
  if (!normalizedSearch) return items;
  return items.filter((item) =>
    getSearchableTexts(item).some((text) =>
      includesSearch(text, normalizedSearch),
    ),
  );
}
