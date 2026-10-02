import { useSearchParams } from "next/navigation";

type SearchParamValueUpdater<TValue> =
  | TValue
  | ((currentValue: TValue) => TValue);

type UseSearchParamStateOptions<TValue extends string> = {
  key: string;
  defaultValue: NoInfer<TValue>;
  parse: (rawValue: string) => TValue | null;
};

function readSearchParamValue<TValue extends string>(
  rawValue: string | null,
  { defaultValue, parse }: Omit<UseSearchParamStateOptions<TValue>, "key">,
) {
  if (rawValue === null) return defaultValue;
  return parse(rawValue) ?? defaultValue;
}

export function useSearchParamState<TValue extends string>({
  key,
  defaultValue,
  parse,
}: UseSearchParamStateOptions<TValue>) {
  const searchParams = useSearchParams();
  const value = readSearchParamValue(searchParams.get(key), {
    defaultValue,
    parse,
  });

  function setValue(nextValueOrUpdater: SearchParamValueUpdater<TValue>) {
    const params = new URLSearchParams(window.location.search);
    const currentValue = readSearchParamValue(params.get(key), {
      defaultValue,
      parse,
    });
    const nextValue =
      typeof nextValueOrUpdater === "function"
        ? nextValueOrUpdater(currentValue)
        : nextValueOrUpdater;

    if (nextValue === defaultValue) params.delete(key);
    else params.set(key, nextValue);

    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }

  return [value, setValue] as const;
}
