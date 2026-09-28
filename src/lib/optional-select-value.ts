export const NONE_SELECT_VALUE = "none";

export function toSelectFieldValue(id: string | null): string {
  return id ?? NONE_SELECT_VALUE;
}

export function fromSelectFieldValue<TId extends string>(
  fieldValue?: string,
): TId | undefined {
  return fieldValue && fieldValue !== NONE_SELECT_VALUE
    ? (fieldValue as TId)
    : undefined;
}
