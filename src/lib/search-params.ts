type SearchParamValue = string | string[] | undefined;

export function getSearchParamValue(value: SearchParamValue) {
  return typeof value === "string" ? value : undefined;
}

export function createOptionParser<const TOption extends string>(
  options: readonly TOption[],
) {
  return function parseOption(rawValue: string) {
    return options.find((option) => option === rawValue) ?? null;
  };
}
